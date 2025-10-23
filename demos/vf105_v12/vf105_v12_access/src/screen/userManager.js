import std from '../../dxmodules/dxStd.js'
import common from '../../dxmodules/dxCommon.js'
import log from '../../dxmodules/dxLogger.js'
import driver from '../driver.js'
import sqliteService from '../service/sqliteService.js'
import faceService from '../service/faceService.js'

// Delete user
function deleteUser(user) {
  // TODO delete user data completely
  sqliteService.d1_person.deleteByUserId(user.userId)
  sqliteService.d1_permission.deleteByUserId(user.userId)
  sqliteService.d1_voucher.deleteByUserId(user.userId)
  let res = driver.face.delete(user.userId)

  return true
}

function updateUser(user) {
  // Update user info
  let res = sqliteService.d1_person.updatenameAndExtraByUserId(user.userId, user.name, JSON.stringify({ type: user.type, idCard: user.idCard }))
  if (res != 0) {
    return false
  }
  // Handle credentials
  let ret
  if (user.pwd) {
    // Check if this credential already exists
    let pwdData = sqliteService.d1_voucher.findByCodeAndType(user.pwd, "400");
    if (pwdData.length > 0 && pwdData[0].userId != user.userId) {
      // Exists and belongs to another user -> fail
      log.info("Password duplicate");
      return "localUserAddView.failPwdRepeat"
    }
    // Update if credential exists for user, otherwise insert
    let countByuserIdAndType = sqliteService.d1_voucher.findByuserIdAndType(user.userId, "400");
    if (countByuserIdAndType.length > 0) {
      ret = sqliteService.d1_voucher.updatecodeByuserIdAndtype(user.userId, "400", user.pwd)
      if (ret != 0) {
        return false
      }
    } else {
      // Insert new
      ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "400", code: user.pwd, userId: user.userId })
      if (ret != 0) {
        return false
      }
    }
  } else {
    // No content -> delete from DB if exists
    sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "400")
  }
  if (user.card) {
    // Check if this credential already exists
    let cardData = sqliteService.d1_voucher.findByCodeAndType(user.card, "200");
    if (cardData.length > 0 && cardData[0].userId != user.userId) {
      // Exists and belongs to another user -> fail
      log.info("Card duplicate");
      return "localUserAddView.failCardRepeat"
    }
    // Update if credential exists for user, otherwise insert
    let countByuserIdAndType = sqliteService.d1_voucher.countByuserIdAndType(user.userId, "200");
    if (countByuserIdAndType > 0) {
      ret = sqliteService.d1_voucher.updatecodeByuserIdAndtype(user.userId, "200", user.card)
      if (ret != 0) {
        return false
      }
    } else {
      // Insert new
      ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "200", code: user.card, userId: user.userId })

      if (ret != 0) {
        return false
      }
    }
  } else {
    // No content -> delete from DB if exists
    sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "200")
  }
  if (user.face) {

    let findByuserIdAndType = sqliteService.d1_voucher.findByuserIdAndType(user.userId, "300");
    if (findByuserIdAndType.length <= 0) {
      let ret = driver.face.registerFaceByPicFile(user.userId, user.face)
      log.info("2 Register face, ret:", ret)
      if (ret != 0) {
        return faceService.regErrorEnum.picture[ret + '']
      }
      // Move the original face image to the user's directory after successful registration
      let src = "/app/data/user/" + user.userId + "/register.jpg"
      std.ensurePathExists(src)
      common.systemBrief('mv ' + user.face + " " + src)

      // Insert new
      ret = sqliteService.d1_voucher.save({ keyId: std.genRandomStr(32), type: "300", code: src, userId: user.userId })
      if (ret != 0) {
        return false
      }
    } else {
      // If exists and a new one is provided: delete old then add new
      if (findByuserIdAndType[0].code != user.face) {
        // Delete old face
        driver.face.delete(user.userId)
        // Register new face
        let res = driver.face.registerFaceByPicFile(user.userId, user.face)
        log.info("3 Register face, res:", res)
        if (res != 0) {
          return faceService.regErrorEnum.picture[res + '']
        }
        let src = "/app/data/user/" + user.userId + "/register.jpg"
        std.ensurePathExists(src)
        // Move the temp face image into the user's folder
        common.systemBrief('mv ' + user.face + " " + src)
        ret = sqliteService.d1_voucher.updatecodeAndExtraByuserIdAndtype(user.userId, "300", src, JSON.stringify({ faceType: 0 }))

      }
    }
  } else {
    // No content -> delete from DB if exists
    sqliteService.d1_voucher.deleteByuserIdAndtype(user.userId, "300")
    driver.face.delete(user.userId)
    common.systemBrief("rm -rf /app/data/user/" + user.userId)
  }

  return true
}

// Insert user
async function insertUser(user) {
  // Start handling credentials
  const saveVoucher = async (type, code) => {
    if (type == "200") {
      let cardData = sqliteService.d1_voucher.findByCodeAndType(code, "200");
      if (cardData.length > 0 && cardData[0].userId != user.userId) {
        // Exists and belongs to another user -> fail
        log.info("Card duplicate");
        return "localUserAddView.failCardRepeat"
      }
    }
    // For type "300" (face), run preSaveCheck before saving
    if (type === "300") {
      let preCheckResult = await preSaveCheck(code); // Assumes this is the method that needs to be called
      if (preCheckResult !== true) { // If precheck fails, return immediately
        return preCheckResult;
      }
      code = "/app/data/user/" + user.userId + "/register.jpg"
    }

    if (type == "400") {
      let pwdData = sqliteService.d1_voucher.findByCodeAndType(code, "400");
      if (pwdData.length > 0 && pwdData[0].userId != user.userId) {
        // Exists, cannot add, return failure
        log.info("Password duplicate");
        return "localUserAddView.failPwdRepeat"
      }
    }

    let keyId = std.genRandomStr(32);

    let extra = type == 300 ? JSON.stringify({ faceType: 0 }) : JSON.stringify({})
    let voucherRet = await sqliteService.d1_voucher.save({
      keyId: keyId,
      type: type,
      code: code,
      userId: user.userId,
      extra: extra
    });

    if (voucherRet != 0) {
      // If voucher save failed, delete user and any saved vouchers
      await sqliteService.d1_person.deleteByUserId(user.userId);
      await sqliteService.d1_voucher.deleteByUserId(user.userId);
      return false;
    }
    return true;
  };
  async function preSaveCheck(code) {
    let ret = driver.face.registerFaceByPicFile(user.userId, code)
    log.info("1 Register face, ret:", ret)
    if (ret != 0) {
      return faceService.regErrorEnum.picture[ret + '']
    }
    // After successful registration, move original image to the user's directory
    let src = "/app/data/user/" + user.userId + "/register.jpg"
    std.ensurePathExists(src)
    common.systemBrief('mv ' + code + " " + src)
    return true;
  }

  let success = true;
  if (success === true && user.face && !(success = await saveVoucher("300", user.face)));
  if (success === true && user.pwd && !(success = await saveVoucher("400", user.pwd)));
  if (success === true && user.card && !(success = await saveVoucher("200", user.card)));


  if (success === true) {
    // Save person info
    let personRet = await sqliteService.d1_person.save({
      userId: user.userId,
      name: user.name,
      extra: JSON.stringify({ type: user.type == 1 ? 1 : 0, idCard: user.idCard })
    });
    if (personRet != 0) {
      sqliteService.d1_voucher.deleteByUserId(user.userId);
      return "localUserAddView.failRepeat"
    }
    // Add a permanent permission entry
    sqliteService.d1_permission.save({ permissionId: user.userId, userId: user.userId, timeType: 0 })
  } else {
    await sqliteService.d1_voucher.deleteByUserId(user.userId);
  }

  return success;

}

// Get local user info
function getVoucher(userId) {

  let person = sqliteService.d1_person.find({ userId: userId });

  if (person.length < 0) {
    return
  }
  let pwd_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "400" })[0] || undefined
  let card_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "200" })[0] || undefined
  let face_voucher = sqliteService.d1_voucher.find({ userId: userId, type: "300" })[0] || undefined
  let idCard_voucher
  try {
    idCard_voucher = JSON.parse(person[0].extra).idCard
  } catch (error) {
  }

  return {
    id: userId,
    idCard: idCard_voucher ? idCard_voucher : undefined,
    card: card_voucher ? card_voucher.code : undefined,
    pwd: pwd_voucher ? pwd_voucher.code : undefined,
    face: face_voucher ? face_voucher.code : undefined,
    type: JSON.parse(person[0].extra).type
  }

}

function getUsers(page = 0, size = 6, userId, name) {
  if (userId || name) {
    let user = sqliteService.d1_person.findByUserId(userId)[0]
    if (user) {
      user.id = user.userId
      return { data: [user], totalPage: 1, totalSize: 1, currentPage: 1 }
    }
    // User names may be duplicated
    let users = sqliteService.d1_person.findByName(name)
    if (users && users.length > 0) {
      users.map(v => {
        v.id = v.userId
      })
      function chunkArray(arr, size) {
        // If array is empty or size is zero, return empty array
        if (arr.length === 0 || size <= 0) {
          return [];
        }
        const result = [];
        // Loop through array and split according to size
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));  // slice cuts specified range of elements
        }
        return result;
      }
      const chunkedArray = chunkArray(users, size);
      return { data: chunkedArray[page], totalPage: Math.ceil(users.length / size), totalSize: users.length, currentPage: page + 1 }
    }
    return { data: [], totalPage: 0, totalSize: 0, currentPage: 1 }
  }
  let userCount = sqliteService.d1_person.count()
  let users = sqliteService.d1_person.findOrderByUserIdAsc({ page, size })
  if (users.length > 0) {
    users.forEach(element => { element.id = element.userId });
  }
  // Total pages
  let totalPage = Math.ceil(userCount / size)
  return { data: users, totalPage: totalPage, totalSize: userCount, currentPage: page + 1 }
}

// Get access records
function getPassRecord(page = 0, size = 6) {
  let passCount = sqliteService.d1_pass_record.count()
  let datas = sqliteService.d1_pass_record.findOrderByTimeDesc({ page, size })
  // Total pages
  let totalPage = Math.ceil(passCount / size)
  return { data: datas, totalPage: totalPage, totalSize: passCount, currentPage: page + 1 }
}

export { deleteUser, updateUser, insertUser, getVoucher, getUsers, getPassRecord }

