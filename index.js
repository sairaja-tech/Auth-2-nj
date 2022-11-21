const express = require("express");
var bodyParser = require("body-parser");

const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));

const dbPath = path.join(__dirname, "goodreads2.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(4004, () => {
      console.log("Server Running at http://localhost:4004/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (authHeader !== undefined) {
      jwtToken = authHeader.split(" ")[1];
    }
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid Token");
    } else {
      jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  };


  //Ger books api
  app.get("/books/", authenticateToken, async (request, response) => {
    const getBooksQuery = `
     SELECT
      *
     FROM
      book
     ORDER BY
      book_id;`;
    const booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
  });

  // User Login API
app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `
      SELECT
        *
      FROM
        user
      WHERE 
        username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);
  
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      
      if (isPasswordMatched === true) {
          const payload = {username:username};
          const jwtToken = jwt.sign(payload,"mosieifg");
  
        response.send({jwtToken});
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });