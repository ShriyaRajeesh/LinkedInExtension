const express = require('express');
const {Sequelize , DataTypes, DATE} = require
('sequelize');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


const sequelize = new Sequelize({
    dialect: 'sqlite', 
    storage: './db.sqlite',
    logging : false
});

const Profile = sequelize.define('Profile' , {
    name : {type : DataTypes.STRING},
    url : {type : DataTypes.STRING , unique : true }, 
    about : {type : DataTypes.TEXT}, 
    bioLine : {type : DataTypes.STRING}, 
    bio : {type : DataTypes.TEXT},
    location: { type: DataTypes.STRING },
    followerCount: { type: DataTypes.STRING },
    connectionCount: { type: DataTypes.STRING }
},{
    tableName:'profiles', 
    timestamps:true
});

(async ()=>{
    await sequelize.sync();
    console.log('Database Synced.');

})();

app.post('/api/profiles' , async(req , res)=>{
    try {
        const payload = req.body;
        if(!payload.url || !payload.name){
            return  res.status(400).json({error: 'url and name required'});
        }

        const [profile , created] = await Profile.upsert(payload , {returning : true});
        res.json({sucsess: true , profile , created});

    }catch(err){
        console.error(err);
        res.status(500).json({error : 'server error' , details : err.message});
    }
});

app.get('/api/profiles', async (req , res)=>{
    const all =  await Profile.findAll({order : [['createdAt' , 'DESC']]});
    res.json(all);
});
const PORT = process.env.PORT || 3000 ; 
app.listen(PORT , () =>{
    console.log('Server Started on Port '  , PORT);
});
