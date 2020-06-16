/**
 * Module dependencies.
 */
const crypto = require('crypto');
const UUID = require('uuid');
const rsa = require("node-rsa");
const https = require('https');
const http = require('http');
const os = require('os');
const exec = require('child_process').exec;
const admzip = require('adm-zip');
const xml2js = require('xml2js');
const parseDomain = require('parse-domain');
const spawn = require('child_process').spawn;

var utils = module.exports = {};

/**
 * 同步 延迟
 * @param ms
 * @returns {Promise<any>}
 */
utils.sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Invoke callback with check
 */
utils.invokeCallback = function (cb) {
	if (typeof cb === 'function') {
		var len = arguments.length;
		if (len == 1) {
			return cb();
		}

		if (len == 2) {
			return cb(arguments[1]);
		}

		if (len == 3) {
			return cb(arguments[1], arguments[2]);
		}

		if (len == 4) {
			return cb(arguments[1], arguments[2], arguments[3]);
		}

		var args = Array(len - 1);
		for (i = 1; i < len; i++)
			args[i - 1] = arguments[i];
		cb.apply(null, args);
		// cb.apply(null, Array.prototype.slice.call(arguments, 1));
	}
};

/**
 * Get the count of elements of object
 */
utils.size = function (obj) {
	var count = 0;
	for (var i in obj) {
		if (obj.hasOwnProperty(i) && typeof obj[i] !== 'function') {
			count++;
		}
	}
	return count;
};

/**
 * Check a string whether ends with another string
 */
utils.endsWith = function (str, suffix) {
	if (typeof str !== 'string' || typeof suffix !== 'string' ||
		suffix.length > str.length) {
		return false;
	}
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
};

/**
 * Check a string whether starts with another string
 */
utils.startsWith = function (str, prefix) {
	if (typeof str !== 'string' || typeof prefix !== 'string' ||
		prefix.length > str.length) {
		return false;
	}

	return str.indexOf(prefix) === 0;
};

/**
 * Compare the two arrays and return the difference.
 */
utils.arrayDiff = function (array1, array2) {
	var o = {};
	for (var i = 0, len = array2.length; i < len; i++) {
		o[array2[i]] = true;
	}

	var result = [];
	for (i = 0, len = array1.length; i < len; i++) {
		var v = array1[i];
		if (o[v]) continue;
		result.push(v);
	}
	return result;
};

/**
 * check if has Chinese characters.
 */
utils.hasChineseChar = function (str) {
	if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
		return true;
	} else {
		return false;
	}
};

/**
 * transform unicode to utf8
 */
utils.unicodeToUtf8 = function (str) {
	var i, len, ch;
	var utf8Str = "";
	len = str.length;
	for (i = 0; i < len; i++) {
		ch = str.charCodeAt(i);

		if ((ch >= 0x0) && (ch <= 0x7F)) {
			utf8Str += str.charAt(i);

		} else if ((ch >= 0x80) && (ch <= 0x7FF)) {
			utf8Str += String.fromCharCode(0xc0 | ((ch >> 6) & 0x1F));
			utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

		} else if ((ch >= 0x800) && (ch <= 0xFFFF)) {
			utf8Str += String.fromCharCode(0xe0 | ((ch >> 12) & 0xF));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

		} else if ((ch >= 0x10000) && (ch <= 0x1FFFFF)) {
			utf8Str += String.fromCharCode(0xF0 | ((ch >> 18) & 0x7));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

		} else if ((ch >= 0x200000) && (ch <= 0x3FFFFFF)) {
			utf8Str += String.fromCharCode(0xF8 | ((ch >> 24) & 0x3));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

		} else if ((ch >= 0x4000000) && (ch <= 0x7FFFFFFF)) {
			utf8Str += String.fromCharCode(0xFC | ((ch >> 30) & 0x1));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 24) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 18) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 12) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | ((ch >> 6) & 0x3F));
			utf8Str += String.fromCharCode(0x80 | (ch & 0x3F));

		}

	}
	return utf8Str;
};

/**
 * Ping server to check if network is available
 *
 */
utils.ping = function (host, cb) {
	if (!module.exports.isLocal(host)) {
		var cmd = 'ping -w 15 ' + host;
		exec(cmd, function (err, stdout, stderr) {
			if (!!err) {
				cb(false);
				return;
			}
			cb(true);
		});
	} else {
		cb(true);
	}
};

utils.extends = function (origin, add) {
	if (!add || !this.isObject(add)) return origin;

	var keys = Object.keys(add);
	var i = keys.length;
	while (i--) {
		origin[keys[i]] = add[keys[i]];
	}
	return origin;
};

var inLocal = function (host) {
	for (var index in localIps) {
		if (host === localIps[index]) {
			return true;
		}
	}
	return false;
};

var localIps = function () {
	var ifaces = os.networkInterfaces();
	var ips = [];
	var func = function (details) {
		if (details.family === 'IPv4') {
			ips.push(details.address);
		}
	};
	for (var dev in ifaces) {
		ifaces[dev].forEach(func);
	}
	return ips;
}();

utils.rsa_decrypto = function (privateKey, crypto_data, length, cb) {
	var container = [];
	var key = new rsa(privateKey, "pkcs1-private-pem", {
		encryptionScheme: "pkcs1"
	});

	for (var i = 0; i < crypto_data.length; i += length) {
		var msg_buffer = key.decrypt(new Buffer(crypto_data.slice(i, i + length)));
		container.push(msg_buffer);
	}

	cb(Buffer.concat(container));
}

utils.rsa_encrypto = function (publicKey, data, length, cb) {
	var container = [];
	var key = new rsa(publicKey, "pkcs1-public-pem", {
		encryptionScheme: "pkcs1"
	});

	for (var i = 0; i < data.length; i += length) {
		var crypto_data = key.encrypt(data.slice(i, i + length));
		container.push(crypto_data);
	}

	cb(Buffer.concat(container));
}

utils.get_obj_length = function (obj) {
	return Object.keys(obj).length;
}

utils.substring_behind = function (str, flag) {
	return str.substring(str.indexOf(flag) + 1);
}

utils.substring_front = function (str, flag) {
	return str.substring(0, str.indexOf(flag));
}

utils.random_in_array = function (items) {
	return items[Math.floor(Math.random() * items.length)];
}

// 生成随机数
utils.randomNum = function (n) {
	var Num = '';
	for (var i = 0; i < n; i++) {
		Num += Math.floor(Math.random() * 10);
	}
	return Num;
}

utils.random_between = function(min, max){
	return Math.floor(
		Math.random() * (max - min) + min
	);
}

utils.random_string = function (count, chars) {
	chars = chars
		|| "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789";
	var rnd = crypto.randomBytes(count)
		, value = new Array(count)
		, len = len = Math.min(256, chars.length)
		, d = 256 / len

	for (var i = 0; i < count; i++) {
		value[i] = chars[Math.floor(rnd[i] / d)]
	};

	return value.join('');
}

utils.valid_array = function (array) {
	if (Array.isArray(array) && array.length > 0) {
		return true;
	}

	return false;
}

utils.valid_phone = function (phone) {
	var reg = /^(\(?\+?[0-9]*\)?)?[0-9_\- \(\)]*$/;

	return reg.test(phone);
}

utils.valid_ipv4 = function (ipaddress) {
	if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
		return true;
	}

	return false;
}

utils.valid_subnet_mask = function (mask) {
	var reg = /^(([01]?\d?\d|2[0-4]\d|25[0-5])\.){3}([01]?\d?\d|2[0-4]\d|25[0-5])\/(\d{1}|[0-2]{1}\d{1}|3[0-2])$/;

	return reg.test(mask);
}

utils.valid_url = function (value) {
	return /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i.test(value);
}

utils.valid_domain_rr = function (domain) {
	if (!domain || domain.indexOf(".") > -1) {
		return false;
	}

	var reg = /^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/;

	return reg.test(domain + ".marsnake.com");
}

utils.valid_domain = function (v) {
	const obj = parseDomain(v);

	if (!obj) {
		return false;
	}

	if (typeof v !== 'string') return false;

	var parts = v.split('.');
	if (parts.length <= 1) return false;

	var tld = parts.pop();
	var tldRegex = /^[a-zA-Z0-9]+$/gi;

	if (!tldRegex.test(tld)) return false;

	var isValid = parts.every(function (host) {
		var hostRegex = /^(?!:\/\/)([a-zA-Z0-9]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])$/gi;
		return hostRegex.test(host);
	});

	return isValid;
}

utils.validate_fullname = function (name) {
	if (!name) {
		return false;
	}

	var reg_symbols = /[!$%^&*()+|~=`{}\[\]:";'<>?,.\/]/;
	var reg_space = /^[\s　]|[ ]$/gi;

	if (!reg_space.test(name) && !reg_symbols.test(name)) {
		return true;
	}

	return false;
}

utils.valid_chinese = function (chinese) {
	var reg = /^[\u4E00-\u9FA5\uf900-\ufa2d·s]{2,20}$/;

	return reg.test(chinese);
}

utils.valid_md5 = function (md5) {
	var reg = /^[A-Za-z0-9]{32}$/;

	return reg.test(md5);
}

utils.valid_sha1 = function (sha1) {
	var reg = /^[A-Za-z0-9]{40}$/;

	return reg.test(sha1);
}

utils.valid_sha256 = function (sha256) {
	var reg = /^[A-Za-z0-9]{64}$/;

	return reg.test(sha256);
}

// 邮箱正则验证
utils.emailVerification = function (username) {
	return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(username);
}

//http://blog.stevenlevithan.com/archives/javascript-password-validator
utils.validatePassword = function (pw, options = {}) {
	if (!pw) {
		return false;
	}

	// default options (allows any password)
	var o = {
		lower: 0,
		upper: 0,
		alpha: 1, /* lower + upper */
		numeric: 1,
		special: 0,
		length: [8, 20],
		custom: [ /* regexes and/or functions */],
		badWords: [],
		badSequenceLength: 0,
		noQwertySequences: false,
		noSequential: false
	};

	for (var property in options) {
		o[property] = options[property];
	}

	var re = {
		lower: /[a-z]/g,
		upper: /[A-Z]/g,
		alpha: /[A-Z]/gi,
		numeric: /[0-9]/g,
		special: /[\W_]/g
	},
		rule, i;

	// enforce min/max length
	if (pw.length < o.length[0] || pw.length > o.length[1]) {
		return false;
	}
	// enforce lower/upper/alpha/numeric/special rules
	for (rule in re) {
		if ((pw.match(re[rule]) || []).length < o[rule]) {
			return false;
		}
	}

	// enforce word ban (case insensitive)
	for (i = 0; i < o.badWords.length; i++) {
		if (pw.toLowerCase().indexOf(o.badWords[i].toLowerCase()) > -1)
			return false;
	}

	// enforce the no sequential, identical characters rule
	if (o.noSequential && /([\S\s])\1/.test(pw)) {
		return false;
	}

	// enforce alphanumeric/qwerty sequence ban rules
	if (o.badSequenceLength) {
		var lower = "abcdefghijklmnopqrstuvwxyz",
			upper = lower.toUpperCase(),
			numbers = "0123456789",
			qwerty = "qwertyuiopasdfghjklzxcvbnm",
			start = o.badSequenceLength - 1,
			seq = "_" + pw.slice(0, start);

		for (i = start; i < pw.length; i++) {
			seq = seq.slice(1) + pw.charAt(i);
			if (
				lower.indexOf(seq) > -1 ||
				upper.indexOf(seq) > -1 ||
				numbers.indexOf(seq) > -1 ||
				(o.noQwertySequences && qwerty.indexOf(seq) > -1)
			) {
				return false;
			}
		}
	}

	// enforce custom regex/function rules
	for (i = 0; i < o.custom.length; i++) {
		rule = o.custom[i];
		if (rule instanceof RegExp) {
			if (!rule.test(pw))
				return false;
		} else if (rule instanceof Function) {
			if (!rule(pw))
				return false;
		}
	}

	// great success!
	return true;
}

utils.versionCompare = function (v1, v2, options) {
	v1 = this.strip_break(v1);
	v2 = this.strip_break(v2);

	var lexicographical = options && options.lexicographical,
		zeroExtend = options && options.zeroExtend,
		v1parts = v1.split('.'),
		v2parts = v2.split('.');

	function isValidPart(x) {
		return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
	}

	if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
		return NaN;
	}

	if (zeroExtend) {
		while (v1parts.length < v2parts.length) v1parts.push("0");
		while (v2parts.length < v1parts.length) v2parts.push("0");
	}

	if (!lexicographical) {
		v1parts = v1parts.map(Number);
		v2parts = v2parts.map(Number);
	}

	for (var i = 0; i < v1parts.length; ++i) {
		if (v2parts.length == i) {
			return 1;
		}

		if (v1parts[i] == v2parts[i]) {
			continue;
		}
		else if (v1parts[i] > v2parts[i]) {
			return 1;
		}
		else {
			return -1;
		}
	}

	if (v1parts.length != v2parts.length) {
		return -1;
	}

	return 0;
}

utils.is_string = function (x) {
	return Object.prototype.toString.call(x) === "[object String]";
}

utils.is_boolean = function (x) {
	return Object.prototype.toString.call(x) === "[object Boolean]";
}

utils.is_integer = function (x) {
	x = Number(x);

	if (isNaN(x)) {
		return false;
	}

	return x % 1 === 0
}

utils.validate_integer = function (n, obj) {
	var re = new RegExp("^\\d{" + n + "}$");

	return re.test(obj);
}

utils.create_uuid = function (n) {
	return crypto.createHash('md5').update(UUID.v1()).digest('hex').substr(0, n);
}

utils.request = function (obj, option, cb) {
	obj.get(option, function (res) {
		var data = [], dataLen = 0;

		res.on('data', function (chunk) {
			data.push(chunk);
			dataLen += chunk.length;
		}).on('end', function () {
			var buf = Buffer.alloc(dataLen);

			for (var i = 0, len = data.length, pos = 0; i < len; i++) {
				data[i].copy(buf, pos);
				pos += data[i].length;
			}

			cb(null, buf);
		});
	}).on('error', (e) => {
		cb(e);
	});
}

utils.https_request = function (option, cb) {
	this.request(https, option, cb);
}

utils.http_request = function (option, cb) {
	this.request(http, option, cb);
}

utils.strip_break = function (str) {
	return str.replace(/\n|\r/g, "");
}

utils.verify_hash = function (algo, content, hashcode) {
	var myhash = this.hash(algo, content);

	return myhash === hashcode;
}

utils.hash = function (algo, content) {
	return crypto.createHash(algo).update(content).digest("hex");
}

utils.valid_https = function (suspect) {
	var pattern = /^((http|https):\/\/)/;
	return pattern.test(suspect);
}

utils.valid_cve_id = function (cve_id) {
	var reg_cve = /^(CVE-(1999|2\d{3})-(0\d{2}[0-9]|[1-9]\d{3,}))$/i;
	return reg_cve.test(cve_id);
}

utils.size_readable = function (num, index) {
	let i = index !== undefined ? index : 0;
	let count = parseFloat(num);
	const suffixs = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
	if (count) {
		if (count < 1024) {
			return count.toFixed(2) + ' ' + suffixs[i];
		} else {
			count /= 1024;
			i++;
			return this.size_readable(count, i);
		}
	} else {
		return '0.00 B'
	}
};

utils.delete_duplicate = function (a, b) {
	let c = a.concat(b);

	return c.filter(function (item, pos) {
		return c.indexOf(item) == pos && !!item;
	});
}

utils.xmlToJson = function (xml) {
	return new Promise((resolve, reject) => {
		xml2js.parseString(xml, function (err, result) {
			if (err) {
				reject(err)
			}
			resolve(result)
		})
	});
}

/**
 * 获取 父域名
 * @param domain
 * @constructor
 */
utils.get_parent_domain = function (domain) {
	let obj = parseDomain(domain);
	let parent_domain = null;

	if (obj.subdomain) {
		if (obj.subdomain.split(".").length > 1) {
			parent_domain = `${obj.subdomain.slice(obj.subdomain.indexOf(".") + 1)}.${obj.domain}.${obj.tld}`;
		} else {
			parent_domain = `${obj.domain}.${obj.tld}`;
		}
	}

	return parent_domain;
}

utils.aes_encrypto = function (algorithm, padding, iv, key, data, cb) {
	this.aes_add_ext(data, function (doc) {
		try {
			var cipherData = [];
			var cipher = crypto.createCipheriv(algorithm, key, iv);

			cipher.setAutoPadding(padding);
			cipherData.push(cipher.update(doc));
			cipherData.push(cipher.final());

			cb(null, Buffer.concat(cipherData));
		} catch (e) {
			cb(e);
		}
	});
}

utils.aes_add_ext = function (data, cb) {
	var paddingStr = "";
	var mode = 16 - (data.length % 16);

	while (mode) {
		paddingStr += "{";
		mode -= 1;
	}

	data = Buffer.concat([data, Buffer.from(paddingStr)]);
	cb(data);
}

utils.aes_decrypt = function (algorithm, key, data, iv) {
	let self = this;

	return new Promise((resolve, reject) => {
		let decoder = [];
		let deCipher = crypto.createDecipheriv(algorithm, key, iv);

		deCipher.setAutoPadding(false);
		decoder.push(deCipher.update(data));
		decoder.push(deCipher.final());

		self.aes_delete_ext(Buffer.concat(decoder).toString(), function (data) {
			resolve(data);
		});
	});
}

utils.aes_delete_ext = function (data, cb) {
	while (data[data.length - 1] == "{") {
		data = data.substring(0, data.length - 1);
	}

	cb(data);
}

utils.rsa_encrypto2 = function (publicKey, data, length, cb) {
	var container = [];

	for (var i = 0; i < data.length; i += length) {
		container.push(crypto.publicEncrypt({
			key: publicKey,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
		}, Buffer.from(data.slice(i, i + length))));
	}

	cb(Buffer.concat(container));
}

utils.order_translate = function (default_sort, ask_sort) {
	let order_translate = {
		"ascend": "asc",
		"descend": "desc"
	};

	if (ask_sort) {
		return {
			[ask_sort.key]: order_translate[ask_sort.order]
		};
	} else {
		return default_sort;
	}
}

utils.spawn = function (proc_name, params) {
	return new Promise((resolve, reject) => {
		let proc = spawn(proc_name, params);

		proc.stdout.setEncoding('utf8');
		proc.stdout.on('data', function (data) {
			let str = data.toString()
			let lines = str.split(/(\r?\n)/g);
			console.log(lines.join(""));
		});

		proc.on('close', function (code) {
			resolve(code);
		});
	});
}