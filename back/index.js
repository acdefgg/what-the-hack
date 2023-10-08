const express = require('express')
const geolib = require('geolib')
const { Sequelize, DataTypes } = require('sequelize')
//const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');



const app = express()
app.use(express.json());
const port = 3000


const sequelize = new Sequelize('postgres://your_postgres_user:your_postgres_password@postgres:5432/your_database_name', {
  dialect: 'postgres',
  dialectOptions: {

  },
});

// const sequelize = new Sequelize('your_database_name',
// 'your_postgres_user',
// 'your_postgres_password',
// {
//   host: process.env.PSQL_HOST || "localhost",
//   dialect: "postgres",
// });
  


const readyUsers = {}

// Определение модели для таблицы Users
const User = sequelize.define('User', {
  uid: {
    type: DataTypes.STRING,
    //allowNull: false,
    //unique: true,
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lon: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

const Spot = sequelize.define('Spot', {
  lat: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lon: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
  },
});

const UserSpot = sequelize.define('UserSpots', {
  UserId: {
    type: DataTypes.INTEGER,
    references: {
      model: User, // 'Movies' would also work
      key: 'id'
    }
  },
  SpotId: {
    type: DataTypes.INTEGER,
    references: {
      model: Spot, // 'Actors' would also work
      key: 'id'
    }
  }
});

User.belongsToMany(Spot, { through: UserSpot});
Spot.belongsToMany(User, { through: UserSpot});

sequelize.sync();

app.post('/getinqueue', async (req, res) => {
  const uid = uuidv4();
  const lat = req.body.lat
  const lon = req.body.lon
  
  const spots = await Spot.findAll()
  const newUser = await User.create({
    lat,
    lon,
    uid,
  })
  console.log('***')
  for (i of spots) {
    if (geolib.isPointWithinRadius(
      {lat: i.dataValues.lat, lon: i.dataValues.lon},
      { lat, lon: lon },
      200
    )) {
      console.log(i.dataValues);
      await newUser.addSpot(i);
    } else {
      console.log('**')
      console.log({ lat, lon })
      console.log(i.dataValues)
      console.log('**')
    }
    
  }

  return res.send({uid})
})

app.post('/getinfo', async (req, res) => {
  const uid = req.body.uid
  
  if (readyUsers[uid]) {
    let spotId = readyUsers[uid]
    //delete readyUsers[uid]
    let spot = await Spot.findOne({id: spotId})
    await User.destroy({
      where: {
        uid: uid
      }
    })
    return res.send({lat: spot.lat, lon: spot.lon})
  }

  const userSpots = await Spot.findAll({
    include: [{
      model: User,
      where: { uid: uid },
    }]
  })

  const spots = []
  for (i of userSpots) {
    const tSpot = await Spot.findByPk(i.id, {
      include: User
    })
    spots.push(tSpot)
  } 
  //console.log(spots)
  //return res.send(spots)
  for (i of spots) {
    if (i.dataValues.Users.length >= 3) {
      console.log('123')
      for (j of i.dataValues.Users) {    
        console.log('NIIICE')
        console.log(j)
        readyUsers[j.uid] = i.id
      }
      let spotId = readyUsers[uid]
      //delete readyUsers[uid]
      let spot = await Spot.findOne({id: spotId})
      await User.destroy({
        where: {
          uid: uid
        }
      })
      return res.send({lat: spot.lat, lon: spot.lon})
    }
  }


  return res.send('хуй те')
})

app.get('/users', async (req, res) => {
  const users = await User.findAll({
    include: Spot
  });
  return res.send(users)
})


app.post('/addspot', async (req, res) => {
  const lat = req.body.lat
  const lon = req.body.lon
  const name = req.body.name
  
  const newSpot = await Spot.create({
    lat,
    lon,
    name,
  })
  const radius = 200 
  return res.send(newSpot)
})

app.get('/spots', async (req, res) => {
  const spots = await Spot.findAll({ include: User});
  return res.send(spots)
})


//DELETE
app.post('/readyuser', async (req, res) => {
  const uid = req.body.uid
  const spotid = req.body.spotid
  readyUsers[uid] = spotid
  return res.send(readyUsers)
})

app.get('/asd', async (req, res) => {
  let s = await Spot.findAll({
    include: [{
      model: User,
      where: { uid: "f8f3c3f0-78df-432c-8895-2b94c8b2137f" } 
    }]
  })
  return res.send(s)
})
app.get('/readyuser', async (req, res) => {
  return res.send(readyUsers)
})


app.listen(port, async () => {

  console.log(`Example app listening on port ${port}`)
})
