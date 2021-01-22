const COS = require('cos-nodejs-sdk-v5');
const mlogger = require("../common/mlogger");
const fs = require("fs");

module.exports = (function(){
	return new qcloud_cos();
})();

function qcloud_cos(){
	this.inited = false;
}

qcloud_cos.prototype.init = function(config){
	if(!this.inited){
		this.config = config;
		this.cos = new COS({
			SecretId: this.config.secretid,
			SecretKey: this.config.secretkey
		});
		
		this.inited = true;
	}
}

qcloud_cos.prototype.upload_file = function(key, filepath){
	let self = this;
	
	return new Promise(function (resolve, reject) {
		self.cos.putObject({
			Bucket: self.config.bucket, /* 必须 */
			Region: self.config.region,    /* 必须 */
			Key: key,              /* 必须 */
			StorageClass: 'STANDARD',
			Body: fs.createReadStream(filepath), // 上传文件对象
		}, function(err, data) {
			if (err) {
				resolve(null);
				return;
			}
			resolve(data);
		});
	});
}

qcloud_cos.prototype.upload_bytes = function(key, data){
	let self = this;
	
	return new Promise(function (resolve, reject) {
		self.cos.putObject({
			Bucket: self.config.bucket,
			Region: self.config.region,
			Key: key,
			StorageClass: 'STANDARD',
			Body: Buffer.from(data),
		}, function(err, data) {
			if (err) {
				resolve(null);
				return;
			}
			resolve(data);
		});
	});
}

qcloud_cos.prototype.download = function(key){
	let self = this;
	
	return new Promise(function (resolve, reject) {
		self.cos.getObject({
			Bucket: self.config.bucket,
			Region: self.config.region,
			Key: key
		}, function(err, data) {
			if (err) {
				resolve(null);
				return;
			}
			resolve(data);
		});
	});
}

qcloud_cos.prototype.download2file = function(key, filepath){
	let self = this;
	
	return new Promise(function (resolve, reject) {
		self.cos.getObject({
			Bucket: self.config.bucket,
			Region: self.config.region,
			Key: key,
			Output: fs.createWriteStream(filepath),
		}, function(err, data) {
			if (err) {
				resolve(null);
				return;
			}
			resolve(data);
		});
	});
}