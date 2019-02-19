'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;


//conexion db
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/red_social', { useMongoClient: true})
		.then (() => {
			console.log(" La conexión  a la base de datos se ha realizado correctamente");

			//crear servidor
			app.listen(port,() => {
				console.log("Servidor corriendo en HTTP://localhost:3800");
			})
		})
		.catch(err => console.log(err));