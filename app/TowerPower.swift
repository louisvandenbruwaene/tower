// Tower Power as a real Mac app: one window with a web view that runs index.html from the game folder,
// so it has its own Dock icon (pin it with Options > Keep in Dock). Built by install_app.sh.
// GamePath (Info.plist) is the game folder; seed.js in Resources, if there, carries the saves over from Brave once.
import Cocoa
import WebKit

final class App: NSObject, NSApplicationDelegate {
    var window: NSWindow!

    func applicationDidFinishLaunching(_ note: Notification) {
        let game = URL(fileURLWithPath: Bundle.main.object(forInfoDictionaryKey: "GamePath") as! String)
        let config = WKWebViewConfiguration()
        config.mediaTypesRequiringUserActionForPlayback = []
        if let seed = Bundle.main.url(forResource: "seed", withExtension: "js"), let js = try? String(contentsOf: seed, encoding: .utf8) {
            config.userContentController.addUserScript(WKUserScript(source: js, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        }
        let view = WKWebView(frame: .zero, configuration: config)
        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1280, height: 800),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Tower Power"
        window.backgroundColor = NSColor(red: 0.016, green: 0.043, blue: 0.031, alpha: 1)   // the game's --bg, no white flash
        window.contentView = view
        window.center()
        window.setFrameAutosaveName("TowerPower")
        window.makeKeyAndOrderFront(nil)
        window.makeFirstResponder(view)
        view.loadFileURL(game.appendingPathComponent("index.html"), allowingReadAccessTo: game)
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }
}

// the menu bar: Quit, the edit keys the prompt needs (copy, paste, select all), full screen
func menu() -> NSMenu {
    let bar = NSMenu()
    func add(_ title: String, _ items: [(String, Selector, String, NSEvent.ModifierFlags)]) {
        let m = NSMenu(title: title)
        for (t, s, k, f) in items { let i = m.addItem(withTitle: t, action: s, keyEquivalent: k); i.keyEquivalentModifierMask = f }
        bar.addItem(withTitle: title, action: nil, keyEquivalent: "").submenu = m
    }
    add("Tower Power", [("Hide Tower Power", #selector(NSApplication.hide(_:)), "h", .command),
                        ("Quit Tower Power", #selector(NSApplication.terminate(_:)), "q", .command)])
    add("Edit", [("Undo", Selector(("undo:")), "z", .command), ("Cut", #selector(NSText.cut(_:)), "x", .command),
                 ("Copy", #selector(NSText.copy(_:)), "c", .command), ("Paste", #selector(NSText.paste(_:)), "v", .command),
                 ("Select All", #selector(NSText.selectAll(_:)), "a", .command)])
    add("View", [("Enter Full Screen", #selector(NSWindow.toggleFullScreen(_:)), "f", [.command, .control])])
    add("Window", [("Minimize", #selector(NSWindow.miniaturize(_:)), "m", .command), ("Close", #selector(NSWindow.performClose(_:)), "w", .command)])
    return bar
}

let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.mainMenu = menu()
app.run()
