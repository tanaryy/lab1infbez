// пропускает дальше только если пользователь вошёл в систему
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect('/login.html?next=' + encodeURIComponent(req.originalUrl));
}

module.exports = requireAuth;
