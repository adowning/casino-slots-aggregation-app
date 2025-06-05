import fs from 'fs';
// import path from 'path'; // Not strictly needed for this version but often useful for path manipulations

export class AssetService {
  // private rootAssetPath: string;

  // constructor(rootAssetPath?: string) {
  //   this.rootAssetPath = rootAssetPath || ''; // Or some sensible default
  //   // In a real app, ensure this.rootAssetPath is an absolute path or handled consistently.
  // }

  private getHttpDate(timestamp: number): string {
    return new Date(timestamp).toUTCString();
  }

  public async pretendResponseIsFile(
    filePath: string,
    contentType: string,
    requestHeaders?: Headers // Hono's Headers object or standard Headers
  ): Promise<Response> {
    try {
      // In a more robust implementation, filePath would be validated and
      // potentially resolved against a secure base asset directory.
      // For example: const resolvedPath = path.join(this.rootAssetPath, filePath);
      // For now, we assume filePath is a direct, accessible path.

      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      const stats = fs.statSync(filePath);
      const lastModifiedTimestamp = stats.mtime.getTime();
      const cacheControl = 'public, max-age=31536000'; // 1 year
      const expiresDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year in the future

      const responseHeaders = {
        'Content-Type': contentType,
        'Expires': this.getHttpDate(expiresDate.getTime()),
        'Cache-Control': cacheControl,
        'Last-Modified': this.getHttpDate(lastModifiedTimestamp),
      };

      const ifModifiedSinceHeader = requestHeaders?.get('If-Modified-Since');
      if (ifModifiedSinceHeader) {
        const ifModifiedSinceTimestamp = new Date(ifModifiedSinceHeader).getTime();
        // Check if the resource has not been modified.
        // Allow a small tolerance (e.g., 1000ms) as mtime precision can vary across filesystems
        // and Date parsing of header might not be perfectly aligned.
        if (lastModifiedTimestamp <= ifModifiedSinceTimestamp + 1000) {
          // Remove Content-Type for 304, keep caching headers
          const { 'Content-Type': _contentType, ...headersFor304 } = responseHeaders;
          return new Response(null, { status: 304, headers: headersFor304 });
        }
      }

      // Serve the file content
      // For large files, streaming (fs.createReadStream) would be more memory efficient.
      const fileContent = fs.readFileSync(filePath);
      return new Response(fileContent, {
        status: 200,
        headers: responseHeaders,
      });

    } catch (error) {
      console.error(`Error serving file ${filePath}:`, error);
      // Avoid leaking error details to the client in production
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}
