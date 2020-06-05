module.exports = function (req, res, con, next) {
    console.log(req.cookies);
    console.log(req.cookies.hash);
    console.log(req.cookies.id);
    if (req.cookies.hash == undefined || req.cookies.id == undefined) {
        res.redirect('/login');
        return false;
    }
    con.query(
        'SELECT * FROM workers WHERE id=' + req.cookies.id + ' and hash="' + req.cookies.hash + '"',
        function (error, result) {
            if (error) reject(error);
            if (result.length == 0) {
                res.redirect('/login');
            }
            else {
                next();
            }
        });
}