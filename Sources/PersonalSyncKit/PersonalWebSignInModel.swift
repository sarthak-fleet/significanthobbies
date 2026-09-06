#if canImport(AuthenticationServices) && (os(iOS) || os(macOS))
import AuthenticationServices
import CryptoKit
import Foundation
import Observation
#if os(iOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

public typealias PersonalWebAuthenticator = @MainActor @Sendable (
    _ url: URL,
    _ callbackScheme: String
) async throws -> URL

@MainActor
@Observable
public final class PersonalAccountModel: NSObject,
    ASWebAuthenticationPresentationContextProviding
{
    public private(set) var session: PersonalIdentitySession?
    public private(set) var isConnecting = false
    public private(set) var errorMessage: String?

    private let identity: PersonalIdentityClient
    private let callbackScheme: String
    private let identityURL: URL
    private var webSession: ASWebAuthenticationSession?
    #if os(macOS)
    private var browserPresentationWindow: NSWindow?
    #endif
    private var rawAppleNonce: String?

    public init(
        identity: PersonalIdentityClient,
        callbackScheme: String,
        identityURL: URL = URL(string: "https://significanthobbies.com")!
    ) {
        self.identity = identity
        self.callbackScheme = callbackScheme
        self.identityURL = identityURL
    }

    public var isSignedIn: Bool { session != nil }

    public func restore() async {
        isConnecting = true
        defer { isConnecting = false }
        do {
            session = try await identity.restoreSession()
            errorMessage = nil
        } catch {
            session = nil
            errorMessage = error.localizedDescription
        }
    }

    public func connectWithGoogle() async {
        await completeGoogleConnection {
            try await self.authenticateInBrowser()
        }
    }

    /// Uses a browser session supplied by the presenting view. SwiftUI's
    /// environment-backed session keeps the authentication presentation tied
    /// to the window that initiated it instead of rediscovering a Mac window
    /// from a long-lived account model.
    public func connectWithGoogle(using authenticate: PersonalWebAuthenticator) async {
        await completeGoogleConnection {
            let callbackURL = try await authenticate(
                Self.googleAuthenticationURL(
                    identityURL: self.identityURL,
                    callbackScheme: self.callbackScheme
                ),
                self.callbackScheme
            )
            return try Self.browserHandoffCode(
                from: callbackURL,
                error: nil,
                expectedScheme: self.callbackScheme
            )
        }
    }

    private func completeGoogleConnection(
        using authenticationCode: @MainActor () async throws -> String
    ) async {
        guard !isConnecting else { return }
        isConnecting = true
        defer { isConnecting = false }
        do {
            let code = try await authenticationCode()
            session = try await identity.exchangeBrowserHandoff(code)
            errorMessage = nil
        } catch let error as ASWebAuthenticationSessionError
            where error.code == .canceledLogin {
            errorMessage = nil
        } catch {
            session = nil
            errorMessage = error.localizedDescription
        }
    }

    public func connect() async {
        await connectWithGoogle()
    }

    public func prepareApple(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        rawAppleNonce = nonce
        request.requestedScopes = [.email, .fullName]
        request.nonce = Self.sha256(nonce)
    }

    public func completeApple(_ result: Result<ASAuthorization, Error>) async {
        isConnecting = true
        defer {
            isConnecting = false
            rawAppleNonce = nil
        }
        do {
            let authorization = try result.get()
            guard
                let apple = authorization.credential as? ASAuthorizationAppleIDCredential,
                let identityToken = apple.identityToken.flatMap({ String(data: $0, encoding: .utf8) }),
                let nonce = rawAppleNonce
            else {
                throw PersonalIdentityError.invalidResponse
            }
            let credential = PersonalAppleCredential(
                identityToken: identityToken,
                nonce: nonce,
                email: apple.email,
                firstName: apple.fullName?.givenName,
                lastName: apple.fullName?.familyName
            )
            session = if session == nil {
                try await identity.signInWithApple(credential)
            } else {
                try await identity.linkApple(credential)
            }
            errorMessage = nil
        } catch let error as ASAuthorizationError where error.code == .canceled {
            errorMessage = nil
        } catch {
            session = nil
            errorMessage = error.localizedDescription
        }
    }

    public func signOut() async {
        await identity.signOut()
        session = nil
        errorMessage = nil
    }

    public func presentationAnchor(for _: ASWebAuthenticationSession) -> ASPresentationAnchor {
        #if os(iOS)
        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow) ?? ASPresentationAnchor()
        #elseif os(macOS)
        return browserPresentationWindow
            ?? Self.preferredPresentationWindow(
                keyWindow: NSApplication.shared.keyWindow,
                mainWindow: NSApplication.shared.mainWindow,
                visibleWindow: NSApplication.shared.windows.first(where: { $0.isVisible })
            )
            ?? ASPresentationAnchor()
        #endif
    }

    private func authenticateInBrowser() async throws -> String {
        let url = Self.googleAuthenticationURL(
            identityURL: identityURL,
            callbackScheme: callbackScheme
        )
        let expectedCallbackScheme = callbackScheme
        #if os(macOS)
        guard let presentationWindow = Self.preferredPresentationWindow(
            keyWindow: NSApplication.shared.keyWindow,
            mainWindow: NSApplication.shared.mainWindow,
            visibleWindow: NSApplication.shared.windows.first(where: { $0.isVisible })
        ) else {
            throw PersonalIdentityError.unavailablePresentationContext
        }
        browserPresentationWindow = presentationWindow
        #endif
        defer {
            webSession = nil
            #if os(macOS)
            browserPresentationWindow = nil
            #endif
        }
        return try await withCheckedThrowingContinuation { continuation in
            // AuthenticationServices may invoke this closure on Safari's XPC
            // executor. Keep it nonisolated: resuming a checked continuation is
            // thread-safe, while touching this @MainActor model here traps under
            // Swift 6 executor enforcement.
            let completion: ASWebAuthenticationSession.CompletionHandler = { callbackURL, error in
                do {
                    continuation.resume(
                        returning: try Self.browserHandoffCode(
                            from: callbackURL,
                            error: error,
                            expectedScheme: expectedCallbackScheme
                        )
                    )
                } catch {
                    continuation.resume(throwing: error)
                }
            }
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: expectedCallbackScheme,
                completionHandler: completion
            )
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            webSession = session
            guard session.start() else {
                continuation.resume(throwing: PersonalIdentityError.invalidResponse)
                return
            }
        }
    }

    nonisolated static func googleAuthenticationURL(
        identityURL: URL,
        callbackScheme: String
    ) -> URL {
        var components = URLComponents(
            url: identityURL.appending(path: "api/native/auth/google/start"),
            resolvingAgainstBaseURL: false
        )!
        components.queryItems = [
            URLQueryItem(name: "callback", value: "\(callbackScheme)://auth"),
        ]
        return components.url!
    }

    #if os(macOS)
    static func preferredPresentationWindow(
        keyWindow: NSWindow?,
        mainWindow: NSWindow?,
        visibleWindow: NSWindow?
    ) -> NSWindow? {
        keyWindow ?? mainWindow ?? visibleWindow
    }
    #endif

    nonisolated static func browserHandoffCode(
        from callbackURL: URL?,
        error: Error?,
        expectedScheme: String
    ) throws -> String {
        if let error { throw error }
        guard let callbackURL,
              callbackURL.scheme == expectedScheme,
              callbackURL.host == "auth",
              let code = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?
                .queryItems?.first(where: { $0.name == "code" })?.value,
              !code.isEmpty
        else {
            throw PersonalIdentityError.invalidResponse
        }
        return code
    }

    private static func sha256(_ value: String) -> String {
        SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

@available(*, deprecated, renamed: "PersonalAccountModel")
public typealias PersonalWebSignInModel = PersonalAccountModel

#endif
