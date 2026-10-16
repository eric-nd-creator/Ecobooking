// Wraps an async Express route handler so a rejected promise reaches the error
// middleware via next(err) instead of becoming an unhandled rejection that can
// crash the whole process on a single bad request.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
