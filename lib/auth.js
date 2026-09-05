const bcrypt = require("bcryptjs");

function hashPassword(pw){ return bcrypt.hashSync(pw, 10); }
function checkPassword(pw, hash){ return bcrypt.compareSync(pw, hash); }

function genTempPassword(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for(let i=0;i<8;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

module.exports = { hashPassword, checkPassword, genTempPassword };
