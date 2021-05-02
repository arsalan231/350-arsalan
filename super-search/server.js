require("dotenv").config();
const argon2 = require("argon2");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.set("port", 8080);

app.use(bodyParser.json({ type: "application/json" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
var Pool = require("pg").Pool;
const config = {
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_PASS,
	database: "supersearch",
};

let simplesearch = 0;
let userzipcode;
app.get("/listplace", async (req, res) => {
	console.log(simplesearch);
	const name = req.query.name;
	let good = 0;
	let great = 0;
	let fin = {};
	let y = 0;
	let last = [];
	try{
		if(simplesearch == 0){
			const template = `Select * from movies where movie ilike '%${name}%'`;
			const response = await pool.query(template);
			if(response.rowCount != 0){
				good = 1;
				const results = response.rows.map(function(item){
					fin = {movie: item.movie, theater: item.theater, address: item.address, city: item.city, zip: item.zip};
					last[y] = fin;
					y++;
				})
			}
			if(name == "movies" && good == 0){
				const template2 = "Select * from movies";
				const response1 = await pool.query(template2);
				if(response1.rowCount != 0){
					good = 1;
					const results = response1.rows.map(function(item){
						fin = {movie: item.movie, theater: item.theater, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}
			}
			if(good == 0){
				const template3 = `Select * from stores where name like '${name}%'`;
				const response3 = await pool.query(template3);
				if(response3.rowCount != 0){
					good = 1;
					const results = response3.rows.map(function(item){
						fin = {name: item.name, type: item.type, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}
			}

			if(good == 0){
				const template4 = `Select * from stores join linker on stores.store_id = linker.store_id join types on linker.type_id = types.type_id where types.t_name ilike '${name}%'`;
				const response4 = await pool.query(template4);

				if(response4.rowCount != 0){
					good = 1;
					const results = response4.rows.map(function(item){
						fin = {name: item.name, type: item.type, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}
			}
		}else{
			const query1 = `Select * from movies join users on users.zipcode = movies.zip where users.zipcode = ${userzipcode} and movies.movie like '%${name}%'`;
			const communicate = await pool.query(query1);
			if(communicate.rowCount != 0){
				great = 1;
				const final_results = communicate.rows.map(function(item){
					fin = {movie: item.movie, theater: item.theater, address: item.address, city: item.city, zip: item.zip};
					last[y] = fin;
					y++;
				})
			}
			if(name == "movies" && great == 0){
				const query2 = `Select * from movies join users on users.zipcode = movies.zip  where users.zipcode = ${userzipcode}`;
				const communicate2 = await pool.query(query2);
				if(communicate2.rowCount != 0){
					great = 1;
					const final_results = communicate2.rows.map(function(item){
						fin = {movie: item.movie, theater: item.theater, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}

			}//end of if
			if(great == 0){
				const query3 = `Select * from stores join users on users.zipcode = stores.zip where users.zipcode = ${userzipcode} and stores.name like '${name}%'`;
				const communicate3 = await pool.query(query3);
				if(communicate3.rowCount != 0){
					great = 1;
					const final_results = communicate3.rows.map(function(item){
						fin = {name: item.name, type: item.type, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}
			}

			if(great == 0){
				const query4 = `Select * from stores join users on users.zipcode = stores.zip join linker on stores.store_id = linker.store_id join types on linker.type_id = types.type_id where users.zipcode = ${userzipcode} and types.t_name ilike '${name}%'`;
				const communicate4 = await pool.query(query4);
				if(communicate4.rowCount != 0){
					great = 1;
					const final_results = communicate4.rows.map(function(item){
						fin = {name: item.name, type: item.type, address: item.address, city: item.city, zip: item.zip};
						last[y] = fin;
						y++;
					})
				}
			}
		}


		res.json(last);

	}
	catch(err){
		console.log(err);
	}
});

app.post("/change", async (req, res) => {
	//This is used to do zipsearch
	simplesearch = 1;
	console.log("Changed to " + simplesearch);
	res.json("Done");
});

app.post("/change2", async (req, res) => {
	//This is used to revert back to simplesearch
	simplesearch = 0;
	console.log("Revert back to " + simplesearch);
	res.json("Done");
});

app.post("/login", async (req, res) => {
	const username = req.body.username;
	const password = req.body.password;
	try{
		const query = "Select password, zipcode from users where username = $1";
		const results = await pool.query(query, [username]);
		if(results.rowCount == 1){
			if(await argon2.verify(results.rows[0].password, password)){
				userzipcode = results.rows[0].zipcode;
				console.log(userzipcode);
				res.json({ status: "success", username: results.rows[0].username });
			}
			else{
				res.json({error: "Password Incorrect"});
			}
		}
		else{
			const query2 = "Select screenname, password from users where username = $1";
			const result2 = await pool.query(query, [username]);
			if(result2.rowCount == 1){
				res.json({ error: "Password Incorrect" });
			} else{
				res.json({ error: "Username not found" });
			}
		}
	} catch (err){
		console.log(err);
	}
});

app.post("/create", async (req, res) => {
	let hash;
	const username = req.body.username;
	const password = req.body.password;
	const zipcode = req.body.zipcode;
	try{
		hash = await argon2.hash(password);
		const query = "Insert into users (username, password, zipcode) Values ($1, $2, $3)";
		const results = await pool.query(query, [username, hash, zipcode]);
		if(results.rowCount == 1){
			res.json({status: "success", username: username });
		}
		else{
			res.json({error: "User not created" });
		}
	} catch(err){
		if(err.message.search("duplicate") != -1){
			res.json({ error: "Username taken" });
		}
	}
});

var pool = new Pool(config);

app.listen(app.get("port"), () => {
	console.log(`Find the server at http://localhost:${app.get("port")}/`);
});
