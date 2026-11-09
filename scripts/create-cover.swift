// Native, deterministic cover layout. Draws the supplied logo directly, without redrawing it.
// Regenerate on macOS: swift scripts/create-cover.swift
import AppKit
let width = 1200, height = 630
let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
let context = NSGraphicsContext(bitmapImageRep: bitmap)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: width, height: height).fill()
let forest = NSColor(srgbRed: 0.114, green: 0.208, blue: 0.153, alpha: 1)
let amber = NSColor(srgbRed: 0.949, green: 0.647, blue: 0.102, alpha: 1)
let muted = NSColor(srgbRed: 0.38, green: 0.42, blue: 0.39, alpha: 1)
func text(_ string: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ weight: NSFont.Weight, _ color: NSColor, tracking: CGFloat = 0) {
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .kern: tracking]
    (string as NSString).draw(at: NSPoint(x: x, y: y), withAttributes: attrs)
}
// Original pixels, original proportions: no recreation, recoloring or AI generation.
let logo = NSImage(contentsOfFile: "logo.png")!
logo.draw(in: NSRect(x: 15, y: 125, width: 465, height: 465), from: .zero, operation: .sourceOver, fraction: 1)
amber.setFill()
NSRect(x: 490, y: 470, width: 55, height: 4).fill()
text("IDEABAY RENTING STORE", 490, 496, 18, .semibold, forest, tracking: 2)
text("Your next shoot.", 486, 371, 54, .semibold, forest, tracking: -2)
text("Starts here.", 486, 307, 54, .semibold, forest, tracking: -2)
text("CAMERA  /  LENS  /  AUDIO  /  LIGHTING", 490, 252, 15, .medium, muted, tracking: 0.7)
text("Professional gear. Ready when you are.", 490, 209, 21, .regular, muted)
NSColor(srgbRed: 0.9, green: 0.91, blue: 0.88, alpha: 1).setFill()
NSRect(x: 65, y: 115, width: 1070, height: 1).fill()
text("MAHARAGAMA, COLOMBO", 65, 66, 15, .medium, forest, tracking: 1)
text("www.ideabay.store", 899, 62, 21, .semibold, forest)
amber.setFill()
NSRect(x: 65, y: 36, width: 1070, height: 4).fill()
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
let data = bitmap.representation(using: .png, properties: [:])!
try data.write(to: URL(fileURLWithPath: "static/og-cover.png"))
print("Created white 1200 × 630 cover using original logo.png directly.")
