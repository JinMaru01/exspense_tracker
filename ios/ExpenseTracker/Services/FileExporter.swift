import Foundation
import SwiftUI

/// Writes export files into the temporary directory so they can be handed to the share sheet.
enum FileExporter {
    static func writeText(_ text: String, named fileName: String) throws -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try text.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    /// Renders a SwiftUI view into a multi-page A4 PDF (vector text and charts).
    @MainActor
    static func writePDF<Content: View>(_ content: Content, named fileName: String) -> URL? {
        let pageSize = CGSize(width: 595, height: 842)
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)

        let renderer = ImageRenderer(content: content
            .frame(width: pageSize.width)
            .environment(\.colorScheme, .light))
        renderer.proposedSize = ProposedViewSize(width: pageSize.width, height: nil)

        var written = false
        renderer.render { size, draw in
            var mediaBox = CGRect(origin: .zero, size: pageSize)
            guard let pdf = CGContext(url as CFURL, mediaBox: &mediaBox, nil) else { return }
            let pages = max(1, Int(ceil(size.height / pageSize.height)))
            for page in 0..<pages {
                pdf.beginPDFPage(nil)
                pdf.saveGState()
                // PDF space starts bottom-left; shift so this page shows the next slice from the top.
                pdf.translateBy(x: 0, y: pageSize.height * CGFloat(page + 1) - size.height)
                draw(pdf)
                pdf.restoreGState()
                pdf.endPDFPage()
            }
            pdf.closePDF()
            written = true
        }
        return written ? url : nil
    }
}

/// UIKit share sheet, used for files generated on demand.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

/// A generated file waiting to be shared; drives `.sheet(item:)`.
struct SharedFile: Identifiable {
    let url: URL
    var id: URL { url }
}
