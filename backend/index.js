const port = 4001;
// importing express
const express = require("express");
// creating app instance
const app = express();
const  mongoose = require("mongoose");
// initializing json webtoken
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");

app.use(express.json());
app.use(cors());

// Database connection with mongodb
// %40=@
mongoose.connect("mongodb+srv://raimaaftab2022:raima%40123f@cluster0.dgkaqxq.mongodb.net/Ecommerce");

// API creation


app.get("/",(req,res) =>{
    res.send("Express App is Running");
})

          

// Image Storage Engine

const storage = multer.diskStorage(
    {
        destination: './upload/images',
        filename:(req,file,cb) =>{
            return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
        }
    }
)                  

const upload = multer({storage:storage})

// Creating upload endpoint for images
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
res.json({
    success:1,
    image_url:`http://localhost:${port}/images/${req.file.filename}`
})
})

//Schema for creating Products

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type:String,
        required:true,
    },
    new_price:{
        type:Number,
        required:true,
    },
    old_price:{
        type:Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

// creating endpoint
app.post('/addproduct',async(req,res) => {

    // creating an array products that hold product
    let products = await Product.find({}); 
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id =  last_product.id+1;
    }
    else{
        id=1;
    }

    const product = new Product({
        // id:req.body.id,    //as noe id genertated automatically
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    // to save created product in mongodb database
    await product.save();
    console.log("saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})
// Creatin Api for deleteing Products
app.post('/removeproduct',async (req,res) => {
await Product.findOneAndDelete({id:req.body.id});
console.log("Removed");
res.json({
    success:true,
    name:req.body.name
})
})

//Creating API for getting all products
app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Schema Creating for User model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

// Creating the Endpoint for registering the User
app.post('/signup', async (req,res) => {
    console.log("Request Body:", req.body);
    // to check pwd already exist or not
    let check = await Users.findOne({email:req.body.email})

    if(check) {
        return res.status(400).json({success:false,errors:"existing user found with same email id"})
    }

    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i]=0;
    }

    // crearting user
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    // saving user in db
    await user.save();

    // using jwt authentication by creating data
    const data = {
        user:{
            id:user.id
        }
    }

    // create token
    const token = jwt.sign(data,'secret_ecom');
// token is not readable using secret

    res.json({success:true,token})
} ) 

// creating endpoint for userlogin
app.post('/login', async (req,res)=> {
    // we will get the user related to the particular id and save in user variable
    let user = await Users.findOne({email:req.body.email});
    if(user) {
        // check existing pass with entered
        const passCompare = req.body.password === user.password;

        if(passCompare) {
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email id"});
    }

})

// Creating an endpoint for newcollection data
app.get('/newcollections',async (req,res) => {
    
    // save all products in an array from mongodb database
    let products = await Product.find({});

    // it will get recently added 8 products from db
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);

} )

// Creating an endpoint for popular in women section
app.get('/popularinwomen',async (req,res) => {
    
    // save all women products in an array from mongodb database
    let products = await Product.find({category:"women"});

    // it will get recently added 4 products from db
    let popular_in_women  = products.slice(0,4);
    console.log("Popular in women Fetched");
    res.send(popular_in_women);

} )

// creating middleware to fetch user
const fetchUser = async (req,res,next) => {

    // take auth token verify it by jwt and than find user
const token = req.header('auth-token');

// first check token available or not
if(!token) {
    res.status(401).send({errors:"Please authenticate using valid token"});
}
else{
try {
  const data = jwt.verify(token,'secret_ecom');
  req.user = data.user;  
  next();
} catch (error) {
    res.status(401).send({errors:"Please authenticate using a valid token"});
}
}
}

// Creating endpoint for adding Products in cart data
// create middleware and add here fetchauser
app.post('/addtocart',fetchUser,async (req,res) => {
console.log(req.body,req.user);
console.log("Added",req.body.itemId);

// use above user id to find userand item it to update cart
let userData = await Users.findOne({_id:req.user.id});
// modify cartdata
userData.cartData[req.body.itemId] += 1;

// now save that data in db
await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
res.send("Added");
})
      
// Creating endpoint to remove product from cartdata
app.post('/removefromcart',fetchUser,async (req,res) => {
    console.log("removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    // modify cartdata
    userData.cartData[req.body.itemId] -= 1;
    
    // now save that data in db
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed");
})

// Creating endpoint to get cartdata
app.post('/getcart',fetchUser,async (req,res) => {
console.log("GetCart");

// id we get from middlewear
let userData = await Users.findOne({_id:req.user.id});
res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if(!error) {
        console.log("Server Runing on "+port);
    }
    else
    {
console.log("Error:"+error);
    }
})  