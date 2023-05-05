import express from "express";
import dotenv from "dotenv";
import { MongoClient , ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import { auth } from "./User/auth.js";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors())
// const port = 9000;

const bike = [{
    id:"1",
    color:"red",
    status: "pending",
},{
    id:"2",
    color:"blue",
    status: "pending",
},{
    id:"3",
    color:"yello",
    status: "pending",
}]

const MONGO_URL = process.env.MONGO_URL;

async function createConnection(){
    try{
        const client = new MongoClient(MONGO_URL);
        await client.connect();
        console.log("MONGO CONNECTED")
        return client;
    }
    catch(err){
        console.log(err,"Server not connected")
    }  
}
const client = await createConnection();

app.get("/user",auth,async (req,res)=>{
    const bikeData = await client
                  .db("bike")
                  .collection("bikeData")
                  .find()
                  .toArray()
    if(bikeData[0]){
      res.send(bikeData)
    }
    else{
        res.status(401).send({msg:"No data found"})
    }
})

app.post("/bikedata",auth,async (req,res)=>{
    const data = req.body;
    // console.log(data,data.bikenumber)
    const findBike = await client
                    .db("bike")
                    .collection("bikeData")
                    .findOne({bikenumber:data.bikenumber})
    // console.log("bike",findBike)
    if(findBike){
        res.send({status:"401",msg:"bike data already exist"})
    }
    else{
        const bikeData = await client
                    .db("bike")
                    .collection("bikeData")
                    .insertMany([data])
    res.send(bikeData)
    }
    
})

app.post("/deleteUser",async(req,res)=>{
    const {id} = req.body;
    // console.log(id,"data")
    let Obj_id = new ObjectId(id);
    await client
                    .db("bike")
                    .collection("bikeData")
                    .deleteOne({_id:Obj_id})
    res.send({msg:"Data deleted"})
})

app.put("/updateStatus",async (req,res)=>{
    const {id,status,token} = req.body;
    // console.log(id,status,token)
    let Obj_id = new ObjectId(id);
    const data = await client
               .db("bike")
               .collection("bikeData")
               .updateOne({ _id: Obj_id },{$set:{status :status}});
    res.send(data)
})

app.get("/userData",auth,async (req,res)=>{
    try {
        const data = await client
        .db("bike")
        .collection("user")
        .find()
        .toArray()
    res.send(data)
    } catch (error) {
        console.log(error)
        res.send({error,msg:"Not Authorized"})
    }
})

app.get("/admin", auth,async (req,res)=>{
   try {
    const data = await client
               .db("bike")
               .collection("bikeData")
               .find()
               .toArray()
        res.send(data)
   } catch (error) {
        // console.log(error)
        res.send({error,msg:"Not Authorized"})
   }
})

app.post("/signup",async (req,res)=>{
    const {name,mail,phone,password,usertype,secretkey} = req.body;
    // console.log(name,mail,phone,password,usertype,secretkey)
    const findUser = await client
                 .db("bike")
                 .collection("user")
                 .find({mail:mail})
                 .toArray();
    if(findUser[0]){
    // console.log(findUser)
    res.status(400).send({status:"401",msg:"User already exist"})
    }
    else if(usertype==="admin" &&  secretkey!==process.env.user_key){
        res.send({status:401,msg:"Invalid Admin"})
    }
    else{
        const hashedPassword = await genPassword(password)
        const user = await client
                  .db("bike")
                  .collection("user")
                  .insertMany([{name:name,mail:mail,phone:phone,password:hashedPassword,userType:usertype}])
        res.send({status:"200",msg:"Successfully registered",user})
    }
})
async function genPassword(password){
    const salt = await bcrypt.genSalt(5);
    // console.log("salt",salt)
    const hashedPassword = await bcrypt.hash(password,salt)
    // console.log("hashedPass",hashedPassword)
    return hashedPassword;
}

app.post("/login",async (req,res)=>{
    const {mail,password} = req.body;
    // console.log(mail,password)

    const findUser = await client
                   .db("bike")
                   .collection("user")
                   .findOne({mail:mail})
    
    if(!findUser){
        res.status(401).send({status:"401",msg:"Invalid Credential, Please try again"})
        return
    }
    const storedPassword = findUser.password;
    // console.log("storedpass",storedPassword)
    // console.log(findUser)
    const passwordMatch = await bcrypt.compare(password,storedPassword);
    if(passwordMatch){
        const token = jwt.sign({id:findUser._id},process.env.SECRET_KEY)
        // console.log("token",token)
        res.send({status:"200",msg:"Successfully login",token:token,userType:findUser.userType});
        return
    }
    else{
        res.status(401).send({status:"401",msg:"Invalid Credential, Please try again"})
        return
    }
}) 
const port = 9000;
app.listen(port,()=>{
    console.log(port,"server connected successfully")
})
