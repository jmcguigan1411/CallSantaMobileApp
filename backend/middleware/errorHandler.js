// middleware/errorHandler.js

// Standard Express error handler
function errorHandler(err, req, res, next) {
  console.error(err.stack); // log error stack to console for debugging

  res.status(err.status || 500).json({
    message: err.message || "Server Error",
  });
}

module.exports = { errorHandler };
