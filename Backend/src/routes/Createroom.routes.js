const express = require('express')
const router = express.Router()


const roomData = new Map();
router.post('/payload',(req, res) =>{
    const roomId  = req.query.roomId;
     const iv = req.body.slice(0, 12)
  const encryptedData = req.body.slice(12)
   roomData.set(roomId, {
  iv,
  encryptedData
})
console.log(roomData)

    res.status(200).json({ok: true})
})
module.exports = router