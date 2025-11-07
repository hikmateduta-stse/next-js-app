const fs = require('fs');
const path = require('path');

// Content type mapping
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
  };
  return types[ext] || 'application/octet-stream';
}

// Check if content type is text-based
function isTextType(contentType) {
  return contentType.startsWith('text/') || 
         contentType.includes('javascript') || 
         contentType.includes('json') ||
         contentType.includes('svg');
}

// Serve file from filesystem
function serveFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const contentType = getContentType(filePath);
  const isText = isTextType(contentType);

  try {
    const content = isText 
      ? fs.readFileSync(filePath, 'utf8')
      : fs.readFileSync(filePath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': contentType.startsWith('text/html') 
          ? 'no-cache, no-store, must-revalidate'
          : 'public, max-age=31536000, immutable'
      },
      body: isText ? content : content.toString('base64'),
      isBase64Encoded: !isText
    };
  } catch (error) {
    console.error('Error reading file:', filePath, error);
    return null;
  }
}

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Get the request path
    const requestPath = event.rawPath || event.path || '/';
    console.log('Request:', event.requestContext?.http?.method || event.httpMethod, requestPath);

    let response;

    // 1. Static assets from _next/static
    if (requestPath.startsWith('/_next/static/')) {
      const staticPath = requestPath.replace('/_next/static/', '');
      const filePath = path.join(__dirname, '.next', 'static', staticPath);
      response = serveFile(filePath);
    }
    
    // 2. Public folder assets
    else if (requestPath.startsWith('/') && requestPath.match(/\.(svg|png|jpg|jpeg|gif|ico|webp|woff|woff2|ttf|eot)$/)) {
      const filePath = path.join(__dirname, 'public', requestPath);
      response = serveFile(filePath);
    }
    
    // 3. Page routes - serve pre-rendered HTML
    else if (requestPath === '/' || requestPath === '/index') {
      const filePath = path.join(__dirname, '.next', 'server', 'app', 'index.html');
      response = serveFile(filePath);
    }
    
    else if (requestPath === '/about') {
      const filePath = path.join(__dirname, '.next', 'server', 'app', 'about.html');
      response = serveFile(filePath);
    }
    
    // 4. 404 for everything else
    else {
      const notFoundPath = path.join(__dirname, '.next', 'server', 'app', '_not-found.html');
      response = serveFile(notFoundPath);
      if (response) {
        response.statusCode = 404;
      }
    }

    // If we got a valid response, return it
    if (response) {
      return response;
    }

    // Final fallback 404
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!DOCTYPE html>
<html>
<head><title>404 - Not Found</title></head>
<body>
  <h1>404 - Page Not Found</h1>
  <p>The requested path <code>${requestPath}</code> was not found.</p>
</body>
</html>`
    };

  } catch (error) {
    console.error('Lambda Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      })
    };
  }
};


