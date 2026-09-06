#if canImport(AuthenticationServices) && (os(iOS) || os(macOS))
import Foundation
import Testing
@testable import PersonalSyncKit
#if os(macOS)
import AppKit
#endif

@Suite("Personal web sign in")
struct PersonalWebSignInModelTests {
    @Test("Accepts only the expected native handoff callback")
    func validatesBrowserHandoff() throws {
        let callback = try #require(URL(string: "anchor://auth?code=one-use-code"))

        #expect(
            try PersonalAccountModel.browserHandoffCode(
                from: callback,
                error: nil,
                expectedScheme: "anchor"
            ) == "one-use-code"
        )
    }

    @Test("Rejects malformed or foreign native handoff callbacks")
    func rejectsInvalidBrowserHandoff() throws {
        let wrongScheme = try #require(URL(string: "other://auth?code=one-use-code"))
        let missingCode = try #require(URL(string: "anchor://auth"))

        #expect(throws: PersonalIdentityError.self) {
            try PersonalAccountModel.browserHandoffCode(
                from: wrongScheme,
                error: nil,
                expectedScheme: "anchor"
            )
        }
        #expect(throws: PersonalIdentityError.self) {
            try PersonalAccountModel.browserHandoffCode(
                from: missingCode,
                error: nil,
                expectedScheme: "anchor"
            )
        }
    }

    #if os(macOS)
    @Test("Pins Google sign-in to an existing Mac window")
    @MainActor
    func selectsExistingMacPresentationWindow() {
        let keyWindow = NSWindow()
        let mainWindow = NSWindow()
        let visibleWindow = NSWindow()

        #expect(
            PersonalAccountModel.preferredPresentationWindow(
                keyWindow: keyWindow,
                mainWindow: mainWindow,
                visibleWindow: visibleWindow
            ) === keyWindow
        )
        #expect(
            PersonalAccountModel.preferredPresentationWindow(
                keyWindow: nil,
                mainWindow: mainWindow,
                visibleWindow: visibleWindow
            ) === mainWindow
        )
        #expect(
            PersonalAccountModel.preferredPresentationWindow(
                keyWindow: nil,
                mainWindow: nil,
                visibleWindow: visibleWindow
            ) === visibleWindow
        )
        #expect(
            PersonalAccountModel.preferredPresentationWindow(
                keyWindow: nil,
                mainWindow: nil,
                visibleWindow: nil
            ) == nil
        )
    }
    #endif
}
#endif
