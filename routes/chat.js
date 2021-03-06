module.exports = chat;


function chat(app, io, Users, Rooms, rndstring){
  app.get('/cht', (req,res)=>{
    res.render('chat.html');
  })
  .post('/room', async (req,res)=>{
    var roomID = {
      "roomID" : rndstring.generate(50)
    }
    var room = new Rooms(roomID);
    var Rresult = await room.save();
    var resultA = await Users.findOne({"token" : req.body.token}) // 유저
    var resultB = await Users.findOne({"email" : req.body.email}) // 친구
    for (i = 0; resultA.roomList[i] != null; i++)
      if(resultA.roomList[i].email === req.body.email)
        return res.status(409).json({message : "already exist"});
    var updateA = {
      "name" : resultA.name,
      "email" : resultA.email,
      "phone" : resultA.phone,
      "profileImg" : resultA.profileImg,
      "isChat" : true
    }
    var updateB = {
      "name" : resultB.name,
      "email" : resultB.email,
      "phone" : resultB.phone,
      "profileImg" : resultB.profileImg,
      "isChat" : true
    }
    var roomA = {
      "email" : req.body.email,
      "roomID" : roomID.roomID
    }
    var roomB = {
      "email" : resultA.email,
      "roomID" : roomID.roomID
    }
    var result = await Users.update({"token" : req.body.token},{$push : {roomList : roomA}})
    result = await Users.update({"token" : req.body.token},{$pop : {friendList : req.body.email}})
    result = await Users.update({"token" : req.body.token},{$push : {friendList : updateB}})
    if(!result.ok) return res.status(500).json({message : "ERR!"});
    var result1 = await Users.update({"email" : req.body.email},{$push : {roomList : roomB}})
    result1 = await Users.update({"email" : req.body.email},{$pop : {friendList : resultA.email}})
    result1 = await Users.update({"email" : req.body.email},  {$push : {friendList : updateA}})
    if(!result1.ok) return res.status(500).json({message : "ERR!"});
    else return res.status(200).send(roomID);
  })
  .post('/invite', async (req,res)=>{
    var room = {
      "roomID" : req.body.roomID
    }
    let result = await Users.update({"email" : req.body.email},
      {$push : {roomInvite : room}}
    )
    if(!result.ok) return res.status(500).json({message : "ERR!"});
    else return res.status(200).json({message : "success!"});
  })
  .post('/accept', async (req,res)=>{
    var roomID = {"roomID" : req.body.roomID}
    let result = await Users.update({"token" : req.body.token},
      {$pop : {roomInvite : req.body.roomID}, $push : {roomList : roomID}}
    )
    if(!result.ok) return res.status(500).json({message : "ERR!"});
    else return res.status(200).send(roomID);
  })
  .post('/roomchk', async(req,res)=>{
    let result = await Users.findOne({token : req.body.token})
    for (i = 0; result.roomList[i] != null; i++)
      if(result.roomList[i].email === req.body.email)
        return res.status(200).send({"roomID" : result.roomList[i].roomID});
    return res.status(404).json({message : "User Not Found!"})
  })
  .post('/roomList', async (req,res)=>{
    let result = await Users.findOne({token : req.body.token})

    if(!result) return res.status(404).json({message : "User Not Found!"})
    else return res.status(200).send(result.roomList);
  })
  .post('/leave', async (req,res)=>{
    let result = await Users.update({token : req.body.token},
      {$pop : {roomList : req.body.roomID}}
    )
    if(!result.ok) return res.status(500).json({message : "ERR!"})
    else return res.status(200).json({message : "success!"})
  })
  function leadingZeros(n, digits) {
    var zero = '';
    n = n.toString();
    if (n.length < digits) {
      for (i = 0; i < digits - n.length; i++)
        zero += '0';
      }
      return zero + n;
  }
  function getWorldTime(tzOffset) { // 24시간제
    var now = new Date();
    var tz = now.getTime() + (now.getTimezoneOffset() * 60000) + (tzOffset * 3600000);
    now.setTime(tz);
    var aft;
    if(leadingZeros(now.getHours(), 2) >= 12)
      aft =  "오후 " + (leadingZeros(now.getHours(), 2)-12);
    else aft = "오전 " + leadingZeros(now.getHours(), 2)
    var s =
    //leadingZeros(now.getFullYear(), 4) + '-' +
    //leadingZeros(now.getMonth() + 1, 2) + '-' +
    //leadingZeros(now.getDate(), 2) + ' ' +
    aft + ':' +
    leadingZeros(now.getMinutes(), 2)
    //leadingZeros(now.getSeconds(), 2);
    return s;
  }
  io.on('connection', (socket)=>{
    console.log('new user! : ', socket.id)
    socket.on('join room', (name, room)=>{
      console.log(name + ' : ' + room)
      var text = name + "님이 방에 들어왔습니다.";
      io.to(room).emit('welcome room', name, text);
      socket.join(room);
    })
    socket.on('leave room', (name, room)=>{
      console.log(name + ' : ' + room)
      var text = name + "님이 방에서 나갔습니다.";
      io.to(room).emit('goodbye room', name, text);
      socket.leave(room);
    })
    socket.on('send message', (name, index, room)=>{
      console.log(room + '. ' + name + ' : ' + index)
      var time = getWorldTime(+9);
      var msg = name + ' : ' + index;
      var returnMsg = {
        "name" : name,
        "index" : index,
        "room" : room,
        "time" : time
      }
      console.log(returnMsg.time)
      socket.broadcast.to(room).emit('receive message', returnMsg);
      //io.emit('receive message web', msg);
    })
    socket.on('disconnect', ()=>{
      console.log('user disconnect')
    })
  })
}
