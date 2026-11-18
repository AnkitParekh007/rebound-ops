// Rasterise an SVG to a PNG of an exact pixel size with AppKit (macOS 14+ can load SVG into NSImage).
import AppKit

let args = CommandLine.arguments
guard args.count == 5, let w = Int(args[3]), let h = Int(args[4]) else {
    FileHandle.standardError.write("usage: svg2png in.svg out.png width height\n".data(using: .utf8)!)
    exit(2)
}
// Register any fonts in REBOUND_FONT_DIR for this process only (no system install).
if let dir = ProcessInfo.processInfo.environment["REBOUND_FONT_DIR"],
   let files = try? FileManager.default.contentsOfDirectory(atPath: dir) {
    for f in files {
        var err: Unmanaged<CFError>?
        let ok = CTFontManagerRegisterFontsForURL(URL(fileURLWithPath: dir).appendingPathComponent(f) as CFURL, .process, &err)
        FileHandle.standardError.write("font \(f): \(ok ? "registered" : "failed")\n".data(using: .utf8)!)
    }
    for fam in NSFontManager.shared.availableFontFamilies where fam.contains("Bricolage") || fam.contains("Instrument") {
        FileHandle.standardError.write("family \(fam)\n".data(using: .utf8)!)
    }
}
guard let image = NSImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("could not load SVG\n".data(using: .utf8)!)
    exit(1)
}
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8,
                           samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
                           colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
rep.size = NSSize(width: w, height: h)
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
NSGraphicsContext.current?.imageInterpolation = .high
image.draw(in: NSRect(x: 0, y: 0, width: w, height: h))
NSGraphicsContext.restoreGraphicsState()
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try! png.write(to: URL(fileURLWithPath: args[2]))
print("wrote \(args[2]) \(w)x\(h)")
