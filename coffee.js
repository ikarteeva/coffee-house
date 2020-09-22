let express = require('express');
let app = express();
let cookieParser = require('cookie-parser');
let admin = require('./admin');
const bodyParser = require("body-parser");

app.use(express.static('public'));

const urlencodedParser = bodyParser.urlencoded({extended: false});

app.set('view engine', 'pug');

let mysql = require('mysql');

const nodemailer = require('nodemailer');

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());

let con = mysql.createConnection({
host: 'localhost',
user: 'root',
password: 'password',
database: 'coffee'
});

app.listen(3000, function(){
console.log('node express work on 3000');
});

app.use(function (req, res, next) {
  if (req.originalUrl == '/admin' || req.originalUrl == '/admin-order') {
    admin(req, res, con, next);
  }
  else {
    next();
  }
});

con.connect((err) => {
    if(err){
        console.log(err);
    }
    console.log('MySql Connected');
});

app.get('/coffee', function (req, res) {
    con.query(

        'SELECT * FROM coffee.reserves',

        function(err, result){

          if (err) throw err;

          let goods = {};
          for(let i = 0; i<result.length; i++){
              goods[result[i]['id']] = result[i];
          }

          let cofId = req.query.id;

          res.render('coffee', {
            goods : JSON.parse(JSON.stringify(goods))
        });
        });


});

app.get('/goods', function (req, res) {
    console.log(req.query.id)
          con.query('SELECT * FROM reserves WHERE id=' +req.query.id, function(err, result, fields){
              if (err) throw err;
              res.render('goods', {goods : JSON.parse(JSON.stringify(result)) });
          })
});

app.get('/order', function (req, res) {
    res.render('order');
  });

app.post('/get-goods-info', function (req, res) {
    console.log(req.body.key);
    if (req.body.key.length !=0){
      con.query('SELECT id,name,cost FROM reserves WHERE id IN ('+req.body.key.join(',')+')', function (error, result, fields) {
        if (error) throw error;
        console.log(result);
        let goods = {};
        for (let i = 0; i < result.length; i++){
          goods[result[i]['id']] = result[i];
        }
        res.json(goods);
      });
    }
    else{
      res.send('0');
    }
  });

app.post('/finish-order', function (req, res) {
  console.log(req.body);
  if (req.body.key.length != 0) {
    let key = Object.keys(req.body.key);
    con.query(
      'SELECT id,name,cost FROM reserves WHERE id IN (' + key.join(',') + ')',
      function (error, result, fields) {
        if (error) throw error;
        console.log(result);
        sendMail(req.body, result).catch(console.error);
        saveOrder(req.body, result);
        res.send('1');
      });
  }
  else {
    res.send('0');
  }
});
  
  async function sendMail(data, result) {
    let res ='<h2> Заказ в ПРОСТО Кофе </h2>';
    let total = 0;
    for (let i=0; i<result.length; i++) {
      res += `<p>${result[i]['name']} - ${data.key[result[i]['id']]} - ${result[i]['cost'] * data.key[result[i]['id']]} рублей</p>`;
      total += result[i]['cost'] * data.key[result[i]['id']];
    }
    console.log(res);
    res += '<hr>';
    res += `Сумма заказа: ${total} рублей`;
    res += `<hr>Номер карты: ${data.card}`;
    res += `<hr>Email: ${data.email}`;
  
    let testAccount = await nodemailer.createTestAccount();
  
    let transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false, 
      auth: {
        user: testAccount.user, 
        pass: testAccount.pass 
      }
    });
  
    let mailOption = {
      from: '<ikarteeva@yandex.ru>',
      to: "ikarteeva@yandex.ru," + data.email,
      subject: "Coffee shop order",
      text: 'Welcome!',
      html: res
    };
  
    let info = await transporter.sendMail(mailOption);
    console.log("MessageSent: %s", info.messageId);
    console.log("PreviewSent: %s", nodemailer.getTestMessageUrl(info));
    return true;
  }
  
  function saveOrder(data, result) {
    
    for (let i = 0; i < result.length; i++) {
      sql = "INSERT INTO orders (date, clientid, goodsid, sum, goodsamount, total) VALUES ( NOW(), " + data.id1 + ", " + result[i]['id'] + ", " + result[i]['cost'] + "," + data.key[result[i]['id']] + ", " + data.key[result[i]['id']] * result[i]['cost'] + ")";
      console.log(sql);
      con.query(sql, function (error, result) {
        if (error) throw error;
        console.log("1 record inserted");
      });
    }
  }

  app.get('/login', function (req, res) {
    res.render('login', {});
  });
  
  app.post('/login', function (req, res) {
    con.query(
      'SELECT * FROM workers WHERE login="' + req.body.login + '" and password="' + req.body.password + '"',
      function (error, result) {
        if (error) reject(error);
        console.log(result);
        console.log(result.length);
        if (result.length == 0) {
          console.log('error user not found');
          res.redirect('/login');
        }
        else {
          result = JSON.parse(JSON.stringify(result));
          let hash = makeHash(32);
          res.cookie('hash', hash);
          res.cookie('id', result[0]['id']);
          sql = "UPDATE workers  SET hash='" + hash + "' WHERE id=" + result[0]['id'];
          con.query(sql, function (error, resultQuery) {
            if (error) throw error;
            res.redirect('/admin');
          });
  
  
        };
      });
  });
  

  function makeHash(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  

app.get('/admin', function (req, res) {
    res.render('admin', {});
});

app.get('/admin-orders', function (req, res) {
  con.query(`SELECT 
	orders.id as id,
  orders.clientid as clientid,
  orders.goodsid as goodsid,
  orders.sum as sum,
  orders.goodsamount as goodsamount,
  orders.total as total,
    orders.date as date,
    clients.fullname as fullname,
    clients.phonenumber as phone,
    clients.email as email,
    clients.cardnumber as cardnumber
FROM 
orders
LEFT JOIN	
	clients
ON orders.clientid = clients.id ORDER BY id DESC`, function(err, result, fields){
      if (err) throw err;
      console.log(result);
      res.render('admin-orders', {orders : JSON.parse(JSON.stringify(result)) });
  })
});

app.get("/admin-workers", function(req, res){
  con.query("SELECT * FROM workers", function(err, data) {
    if(err) throw err;
    res.render("admin-workers.hbs", {
        workers: data
    });
  });
});

app.get("/createw", function(req, res){
  res.render("createw.hbs");
}); 

app.post("/createw", urlencodedParser, function (req, res) {
       
  if(!req.body) return res.sendStatus(400);
  const fullname = req.body.name;
  const email = req.body.email;
  const phonenumber = req.body.phonenumber;
  const position = req.body.position;
  const login = req.body.login;
  const password = req.body.password;
  con.query("INSERT INTO workers (fullname, email, phonenumber, position, login, password) VALUES (?,?,?,?,?,?)", [fullname, email, phonenumber, position, login, password], function(err, data) {
    if(err) return console.log(err);
    res.redirect("/admin-workers");
  });
});

app.get("/editw/:id", function(req, res){
const id = req.params.id;
con.query("SELECT * FROM workers WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
   res.render("editw.hbs", {
      user: data[0]
  });
});
});

app.post("/editw", urlencodedParser, function (req, res) {
       
if(!req.body) return res.sendStatus(400);
const fullname = req.body.name;
const email = req.body.email;
const phonenumber = req.body.phonenumber;
const position = req.body.position;
const id = req.body.id;
con.query("UPDATE workers SET fullname=?, email=?, phonenumber=?, position=? WHERE id=?", [fullname, email, phonenumber, position, id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-workers");
});
});

app.post("/deletew/:id", function(req, res){
        
const id = req.params.id;
con.query("DELETE FROM workers WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-workers");
});
});

app.get("/admin-goods", function(req, res){
  con.query("SELECT * FROM reserves", function(err, data) {
    if(err) throw err;
    res.render("admin-goods.hbs", {
        goods: data
    });
  });
});

app.get("/createg", function(req, res){
  res.render("createg.hbs");
}); 

app.post("/createg", urlencodedParser, function (req, res) {
       
  if(!req.body) return res.sendStatus(400);
  const name = req.body.name;
  const meaning = req.body.meaning;
  const image = req.body.image;
  const cost = req.body.cost;
  con.query("INSERT INTO reserves (name, meaning, image, cost) VALUES (?,?,?,?)", [name, meaning, image, cost], function(err, data) {
    if(err) return console.log(err);
    res.redirect("/admin-goods");
  });
});

app.get("/editg/:id", function(req, res){
const id = req.params.id;
con.query("SELECT * FROM reserves WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
   res.render("editg.hbs", {
      user: data[0]
  });
});
});

app.post("/editg", urlencodedParser, function (req, res) {
       
if(!req.body) return res.sendStatus(400);
const name = req.body.name;
const meaning = req.body.meaning;
const image = req.body.image;
const cost = req.body.cost;
const id = req.body.id;
con.query("UPDATE reserves SET name=?, meaning=?, image=?, cost=? WHERE id=?", [name, meaning, image, cost, id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-goods");
});
});

app.post("/deleteg/:id", function(req, res){
        
const id = req.params.id;
con.query("DELETE FROM reserves WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-goods");
});
});

app.get("/admin-clients", function(req, res){
  con.query("SELECT * FROM clients", function(err, data) {
    if(err) throw err;
    res.render("admin-clients.hbs", {
        clients: data
    });
  });
});

app.get("/createc", function(req, res){
  res.render("createc.hbs");
}); 

app.post("/createc", urlencodedParser, function (req, res) {
       
  if(!req.body) return res.sendStatus(400);
  const fullname = req.body.name;
  const email = req.body.email;
  const phonenumber = req.body.phonenumber;
  const cardnumber = req.body.cardnumber;
  con.query("INSERT INTO clients (fullname, email, phonenumber, cardnumber) VALUES (?,?,?,?)", [fullname, email, phonenumber, cardnumber], function(err, data) {
    if(err) return console.log(err);
    res.redirect("/admin-clients");
  });
});

app.get("/editc/:id", function(req, res){
const id = req.params.id;
con.query("SELECT * FROM clients WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
   res.render("editc.hbs", {
      user: data[0]
  });
});
});

app.post("/editc", urlencodedParser, function (req, res) {
       
if(!req.body) return res.sendStatus(400);
const fullname = req.body.name;
const email = req.body.email;
const phonenumber = req.body.phonenumber;
const cardnumber = req.body.cardnumber;
const id = req.body.id;
con.query("UPDATE clients SET fullname=?, email=?, phonenumber=?, cardnumber=? WHERE id=?", [fullname, email, phonenumber, cardnumber, id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-clients");
});
});

app.post("/deletec/:id", function(req, res){
        
const id = req.params.id;
con.query("DELETE FROM clients WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-clients");
});
});

app.get("/admin-branches", function(req, res){
  con.query("SELECT * FROM branches", function(err, data) {
    if(err) throw err;
    res.render("admin-branches.hbs", {
        branches: data
    });
  });
});

app.get("/createb", function(req, res){
  res.render("createb.hbs");
}); 

app.post("/createb", urlencodedParser, function (req, res) {
       
  if(!req.body) return res.sendStatus(400);
  const name = req.body.name;
  const address= req.body.address;
  const managerid = req.body.managerid;
  con.query("INSERT INTO branches (name, address, managerid) VALUES (?,?,?)", [name, address, managerid], function(err, data) {
    if(err) return console.log(err);
    res.redirect("/admin-branches");
  });
});

app.get("/editb/:id", function(req, res){
const id = req.params.id;
con.query("SELECT * FROM branches WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
   res.render("editb.hbs", {
      user: data[0]
  });
});
});

app.post("/editb", urlencodedParser, function (req, res) {
       
if(!req.body) return res.sendStatus(400);
const name = req.body.name;
const address= req.body.address;
const managerid = req.body.managerid;
const id = req.body.id;
con.query("UPDATE branches SET name=?, address=?, managerid=? WHERE id=?", [name, address, managerid,  id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-branches");
});
});

app.post("/deleteb/:id", function(req, res){
        
const id = req.params.id;
con.query("DELETE FROM branches WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-branches");
});
});

app.get("/admin-equipments", function(req, res){
  con.query("SELECT * FROM equipments", function(err, data) {
    if(err) throw err;
    res.render("admin-equipments.hbs", {
        equipments: data
    });
  });
});

app.get("/createe", function(req, res){
  res.render("createe.hbs");
}); 

app.post("/createe", urlencodedParser, function (req, res) {
       
  if(!req.body) return res.sendStatus(400);
  const name = req.body.name;
  const status= req.body.status;
  con.query("INSERT INTO equipments (name, status) VALUES (?,?)", [name, status], function(err, data) {
    if(err) return console.log(err);
    res.redirect("/admin-equipments");
  });
});

app.get("/edite/:id", function(req, res){
const id = req.params.id;
con.query("SELECT * FROM equipments WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
   res.render("edite.hbs", {
      user: data[0]
  });
});
});

app.post("/edite", urlencodedParser, function (req, res) {
       
if(!req.body) return res.sendStatus(400);
const name = req.body.name;
const status= req.body.status;
const id = req.body.id;
con.query("UPDATE equipments SET name=?, status=? WHERE id=?", [name, status, id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-equipments");
});
});

app.post("/deletee/:id", function(req, res){
        
const id = req.params.id;
con.query("DELETE FROM equipments WHERE id=?", [id], function(err, data) {
  if(err) return console.log(err);
  res.redirect("/admin-equipments");
});
});

app.get('*', function(req, res){

    con.query(
        'SELECT * FROM coffee.reserves',
        function(err, result){
          if (err) throw err;
          let goods = {};
          for(let i = 0; i<result.length; i++){
              goods[result[i]['id']] = result[i];
          }

    res.send((res.render('coffee', {
        goods : JSON.parse(JSON.stringify(goods))
    })), 404);
  });
});
