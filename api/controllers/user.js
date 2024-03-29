'use strict'
var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
var User = require('../models/user');
var jwt = require('../services/jwt');
var fs = require('fs');
var path = require('path');
var Follow = require('../models/follow');


//METODOS DE PRUEBA 
function home(req, res) {
	res.status(200).send({
		message: 'Accion de pruebas en el servidor de NodeJS'
	});
}

function pruebas(req, res) {
	res.status(200).send({
		message: 'Accion de pruebas en el servidor de NodeJS'
	});
}

//REGISTRO
function saveUser(req,res){
	var params = req.body;
	var user = new User();


	if(params.name && params.surname && params.nick &&
	 params.email && params.password){

		user.name = params.name;
		user.surname = params.surname;
		user.nick = params.nick;
		user.email = params.email;
		user.role = 'ROLE_USER';
		user.image = null;

		//CONTROLAR QUE EL NICK Y MAIL NO ESTEN YA REGISTRADOS
		User.find({ $or: [
			 			{email: user.email.toLowerCase()},
			 			{nick: user.nick.toLowerCase()}
			 			]}).exec((err, users) => {
			 				if(err) return res.status(500).send({message: 'Error en la petición de usuarios'});
			 			
			 				if(users && users.length >= 1){
			 					return res.status(200).send({message: 'El usuario que intenta registrar ya existe'});
			 				}else{
			 					//CIFRA Y GUARDA LOS DATOS 
								bcrypt.hash(params.password, null, null, (err, hash) => {
									user.password = hash;

									user.save((err, userStored) => {
										if(err) return res.status(500).send({message: 'Error al guardar el usuario'});

										if(userStored){
											res.status(200).send({user: userStored});
										}else{
											res.status(404).send({message: 'No se ha registrado el usuario'});
										}

									});
								});

							}
						});
		
	}else{
		res.status(200).send({
			message: 'Envia todos los campos necesarios'
		});
	}
}


//LOGIN DE USUARIOS
function loginUser(req, res){
	var params = req.body;

	var email = params.email;
	var password = params.password;

	User.findOne({email: email}, (err, user) => {
		if(err) return res.status(500).send({message: 'Error en la petición'});

		if(user){
			bcrypt.compare(password, user.password, (err, check) => {
				if(check){
					
					if(params.gettoken){
					//generar token y devolver token
					return res.status(200).send({
						token: jwt.createToken(user)
					});
					}else{
					//devolver datos de usuario
						user.password = undefined;
						return res.status(200).send({user})
					}

					
				}else{
					return res.status(404).send({message: 'El usuario no se ha podido identificar'});
				}
			});
		}else{
			return res.status(404).send({message: 'El usuario no se ha podido identificar!!!!'});
		}
	});


}

//METODO PARA LISTAR DATOS DE USUARIO

function getUser(req, res){
	var userId = req.params.id;

	User.findById(userId, (err, user) => {
		if(err) return res.status(500).send({message: 'Error en la peticion'});
	
		if(!user) return res.status(404).send({message: 'El usuario no existe'});

		Follow.findOne({"user":req.user.sub, "followed":userId}).exec((err, follow) =>{
			if(err) return res.status(500).send({message: 'Error al comprobar el seguimiento'});
			return res.status(200).send({user, follow});
		});

	});
}

//DEVOLVER LISTADO DE USERS PAGINADOS

function getUsers(req, res){
	var identity_user_id = req.user.sub;
	var page = 1;
	if(req.params.page){
		page = req.params.page;
	}

	var itemsPerPage = 5;

	User.find().sort('_id').paginate(page, itemsPerPage, (err, users, total) => {
		if(err) return res.status(500).send({message:'Error en la petición'});

		if(!users) return res.status(404).send({message:'No hay usuarios en la plataforma'});
	
		return res.status(200).send({
			users,
			total,
			pages: Math.ceil(total/itemsPerPage)
		});
	});
}

//ACTUALIZAR DATOS DE UN USUARIO
function updateUser(req, res){
	var userId = req.params.id;
	var update = req.body;

	//borrar propiedad password
	delete update.password;

	if(userId != req.user.sub){
		return res.status(500).send({message: 'No tienes permiso para actualizar los datos del usuario'});
	}

	User.findByIdAndUpdate(userId, update, {new: true}, (err, userUpdated) => {
		if(err) return res.status(500).send({message:'Error en la petición'});

		if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar la informacion'});
	
		return res.status(200).send({user: userUpdated});
	});
}

//SUBIR AVATAR

function uploadImage(req, res){
	var userId = req.params.id;

	

	if(req.files){
		var file_path = req.files.image.path;
		console.log(file_path);

		var file_split = file_path.split('\\');
		console.log(file_split);

		var file_name = file_split[2];
		console.log(file_name);

		var ext_split = file_name.split('\.');
		console.log(ext_split);

		var file_ext = ext_split[1];

		if(userId != req.user.sub){
		return removeFilesOfUploads(res, file_path, 'No tienes permisos para actualizar los datos del usuario')
		
	}

		if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
			//actualizar documento de usuario logueado
			User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdated) =>{
				if(err) return res.status(500).send({message:'Error en la petición'});

				if(!userUpdated) return res.status(404).send({message: 'No se ha podido actualizar la informacion'});
	
				return res.status(200).send({user: userUpdated});
				});
		}else{
			return removeFilesOfUploads(res, file_path, 'extension no valida');
		}

	}else{
		return res.status(200).send({message: 'No se han subido imagenes'});
	}
}



function removeFilesOfUploads(res, file_path, message){
			fs.unlink(file_path, (err) =>{
				return res.status(200).send({message: message});
			});
}



function getImageFile(req, res){
	var image_file = req.params.imageFile;
	var path_file = './uploads/users/'+image_file;

	fs.exists(path_file, (exists) => {
		if(exists){
			res.sendFile(path.resolve(path_file));
		}else{
			res.status(200).send({message: 'No existe la imagen...'});
		}
	});
}



//EXPORTAMOS LAS FUNCIONES
module.exports = {
	home,
	pruebas,
	saveUser,
	loginUser,
	getUser,
	getUsers,
	updateUser,
	uploadImage,
	getImageFile
	/*
	*/
}