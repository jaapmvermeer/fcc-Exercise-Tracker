const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser');
const req = require('express/lib/request')



app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });


const logSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true
    },
    count: Number,
    log: [{
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: Date,
    }]
  });


let Log = mongoose.model('Log', logSchema);

const createUser = (userName) => {
  let log = new Log({
    username: userName
  });
  return log.save(); // Returns a Promise
};

const findEditThenSave = (body, done) => {

  Log.findById({ _id: body._id })
    .then(log => {
      if (!log) {
        throw new Error("User not found");
      }

      log.count = log.count ? log.count + 1 : 1;
      log.log.push({
        description: body.description,
        duration: body.duration,
        date: body.date ? new Date(body.date) : new Date()
      });
      return log.save();
    })
    .then(updatedLog => done(null, updatedLog))
    .catch(err => done(err));
};

const findUsers = () => {
  return Log.find()
};

const findById = (id) => {
  return Log.findById({ "_id": id });
};

app.use('/api/users', bodyParser.urlencoded({ extended: false }))


app.post('/api/users/:_id/exercises', async (req, res) => {


  findEditThenSave({ ...req.body, _id: req.params._id }, (err, data) => {
    if (err) {
      // Handle error
      return res.status(500).send(`Error saving log: ${err.message}`);
    }
    // Handle success
    const returnObj = {
      username: data.username,
      description: data.log[data.count - 1].description,
      duration: data.log[data.count - 1].duration,
      date: data.log[data.count - 1].date.toDateString(),
      _id: data._id
    };
  
    res.status(200).json(returnObj);
  });
});

app.post('/api/users', async (req, res) => {
  try {
    const userName = req.body.username;
    const data = await createUser(userName);
  
    res.json({ username: data.username, _id: data._id });
  } catch (err) {
    res.status(500).send(`Error saving log: ${err.message}`);
  }
});
app.get('/api/users', async (req, res) => {
  try {
    const data = await findUsers();

    res.json(data.map((log) => { return { username: log.username, _id: log._id } }));
  } catch (err) {
    res.status(500).send(`Error finding users: ${err.message}`);

  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
  

    let { from, to, limit } = req.query;
 
    if (!from) from = "01-01-1900";
    if (!to) to = new Date().toDateString();
    const data = await findById(req.params._id);

    if (!limit) limit = data.log.length
    const returnObj =
    {
      username: data.username,
      count: data.count,
      _id: data._id,
      log: data.log
      .filter((el) => { 
        return (el.date > new Date(from) && (el.date <= new Date(to) || el.date.toDateString() === new Date(to).toDateString()))
      } )
      .slice(0, parseInt(limit))
      .map((log) => {
        return {
          description: log.description,
          duration: log.duration,
          date: log.date.toDateString(),
        }
      })
    }
    res.json(returnObj);
  } catch (err) {
    res.status(500).send(`Error finding log of user: ${err.message}`);

  }
});






const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
