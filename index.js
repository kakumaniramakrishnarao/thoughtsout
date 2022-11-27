const express = require('express')
// const cors=require('cors')
const mongoose = require('mongoose')
const md5 = require('md5')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const app = express()

app.use(express.json())
// app.use(cors({origin:'*'}))

app.use(express.static(__dirname + '/build'))

var url = 'mongodb+srv://rk:hSoqRiMJyF6le2uT@cluster0.anpnddn.mongodb.net/?retryWrites=true&w=majority'
var localHost = 'mongodb://localhost:27017/blogdata'
mongoose.connect(localHost, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  caption: String,
  profile: {
    type: String,
    default: 'null'
  },
  friends: [String],
  thoughts: [Object],
  friendRequests: [{ username: String, profile: String }],
  friendRequestsWatched: { type: Boolean, default: false },
  sentRequests: [String]
})

const blogUser = new mongoose.model('blogusers', userSchema)

const mailOtpSchema = new mongoose.Schema({
  email: String,
  token: String
})

const mailOtpModel = new mongoose.model('blogMailOtp', mailOtpSchema)

app.post('/api/verify', (req, res) => {
  jwt.verify(req.body.token, "thoughtsout", function (err, data) {
    if (data) {
      res.json({ message: data })
    }
    else {
      res.json({ message: false })
    }
  })
})

app.post('/api/login', (req, res) => {
  blogUser.findOne({ email: req.body.email }, function (err, data) {
    if (data) {
      if (md5(req.body.password) == data.password) {
        const newUser = {
          email: req.body.email,
          username: data.username
        }
        const token = jwt.sign(newUser, 'thoughtsout', { expiresIn: '1d' })
        res.json({ message: { authToken: token } })
      }
      else {
        res.json({ message: 'incorrect password' })
      }
    } else {
      res.json({ message: 'No user found' })
    }
  })
})

app.post('/api/signup', (req, res) => {

  blogUser.findOne({ email: req.body.email }, function (err, data) {
    if (data) {
      res.json({ authToken: false })
    }
    else {
      const newUser = {
        email: req.body.email,
        username: req.body.username
      }

      const userData = new blogUser({
        email: req.body.email,
        username: req.body.username,
        password: md5(req.body.password),
        friends: ['ThoughtsWorld'],
        caption: 'Happy Soul 😊'
      })

      userData.save(() => {
        const token = jwt.sign(newUser, 'thoughtsout', { expiresIn: '1d' })
        res.json({ authToken: token })
      })

    }
  })

})

app.post('/api/usernameAndMailFinder', async (req, res) => {
  try {
    const message = { usernameFound: false, emailFound: false }

    const username = await blogUser.find({ username: req.body.username })
    if (username[0]) {
      message.usernameFound = true
    }

    const email = await blogUser.find({ email: req.body.email })

    if (email[0]) {
      message.emailFound = true
    }

    res.json(message)
  }
  catch (err) {
    console.log(err)
  }
})

app.post('/api/setmailotp', async function (req, res) {
  try {

    var randomOtpGen = Math.round(Math.random() * 1000000)

    const msg = {
      from: 'thoughtsoutworld@gmail.com',
      to: req.body.email,
      subject: 'testing...',
      html: `<html>
            <head>
            </head>
            <body>
                <h1>${randomOtpGen}</h1>
            </body>
            </html>`
    }

    nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'thoughtsoutworld@gmail.com',
        pass: 'duywmvfldcfiynfk'
      },
      port: 465,
      host: 'smtp.gmail.com',
    })
      .sendMail(msg, function (err) {
        if (err) {
          console.log(err)
        }
        else {
          const query = { email: req.body.email };
          const update = { $set: { email: req.body.email, token: randomOtpGen } };
          const options = { upsert: true };

          mailOtpModel.updateOne(query, update, options, function (err, data) {
            if (data) {
              res.json({ message: true })
            }
          });
        }
      })
  }
  catch (err) {
    console.log(err)
  }

})

app.post('/api/getProfileCaption', function (req, res) {
  try {
    blogUser.find({ email: req.body.email }, function (err, data) {
      res.json({ caption: data[0].caption, profile: data[0].profile })
    })
  }
  catch (err) {
    console.log(err)
  }
})
app.post('/api/updateprofile', function (req, res) {
  try {
    blogUser.findOneAndUpdate({ email: req.body.email }, { profile: req.body.profile }, function (err, data) {
      if (err) {
        res.json({ message: false })
      } else {
        res.json({ message: true })
      }
    })
  }
  catch (err) {
    console.log(err)
  }
})
app.post('/api/updatecaption', function (req, res) {
  try {
    blogUser.findOneAndUpdate({ email: req.body.email }, { caption: req.body.caption }, function (err, data) {
      if (err) {
        res.json({ message: false })
      } else {
        res.json({ message: true })
      }
    })
  }
  catch (err) {
    console.log(err)
  }
})

app.post('/api/otpValidation', function (req, res) {
  mailOtpModel.find({ email: req.body.email }, function (err, data) {
    if (err) {
      console.log(err)
    } else {
      if (data[0].token == req.body.otp) {
        res.json({ message: true })
      }
      else {
        res.json({ message: false })
      }
    }
  })
})

app.post('/api/thoughtColl', async function (req, res) {
  await blogUser.updateOne({ email: req.body.email }, { $push: { thoughts: { tweet: req.body.thought.tweet, time: req.body.thought.time } } })
  blogUser.find({ email: req.body.email }, 'thoughts', function (err, someValue) {
    res.json({ someValue })
  })
})

app.post('/api/thoughtsSender', function (req, res) {
  blogUser.find({ email: req.body.email }, 'thoughts', function (err, someValue) {
    res.json(someValue)
  })
})
app.post('/api/searcher', function (req, res) {
  blogUser.findOne({ username: req.body.usernameTo }, function (err, someValue) {
    if (someValue) {
      blogUser.find({ username: req.body.usernameFrom }, function (err, data) {
        var sentReqObj = { SentReqStatus: 0 }
        var flag = true
        for (i in data[0].friends) {
          if (data[0].friends[i] == req.body.usernameTo) {
            sentReqObj.SentReqStatus = 1
            flag = false
            break
          }
        }
        if (flag) {
          for (i in data[0].sentRequests) {
            if (data[0].sentRequests[i] == req.body.usernameTo) {
              sentReqObj.SentReqStatus = 2
              break
            }
          }
        }

        res.json({ message: { username: req.body.usernameTo, profile: someValue.profile, RequestStatus: sentReqObj } })
      })
    }
    else {
      res.json({ message: false })
    }
  })
})

app.post('/api/sendRequests', function (req, res) {
  blogUser.find({ username: req.body.usernameFrom }, 'sentRequests', function (err, data) {
    var alreadySentObj = { alreadySent: false }
    for (i in data[0].sentRequests) {
      if (data[0].sentRequests[i] == req.body.usernameTo) {
        alreadySentObj.alreadySent = true
        break
      }
    }

    blogUser.find({ username: req.body.usernameFrom }, 'profile', async function (err, someValue) {
      var friendReqObj = {
        username: req.body.usernameFrom,
        profile: someValue[0].profile,
        alreadySent: alreadySentObj.alreadySent
      }
      if (alreadySentObj.alreadySent) {
        res.json({ message: friendReqObj })
      } else {
        await blogUser.findOneAndUpdate({ username: req.body.usernameFrom }, { $push: { sentRequests: req.body.usernameTo } })
        await blogUser.findOneAndUpdate({ username: req.body.usernameTo }, { $set: { friendRequestsWatched: true }, $push: { friendRequests: friendReqObj } })
        res.json({ message: friendReqObj })
      }
    })

  })
})

app.post('/api/friendrequests', function (req, res) {
  blogUser.find({ email: req.body.email }, function (err, data) {
    var requestsDataObj = {
      friendRequests: data[0].friendRequests,
    }
    res.json({ message: requestsDataObj })
  })
})

app.post('/api/friendRequestsAnimToggle', function (req, res) {
  var sideBarData = { Watched: false, profile: 'null' }

  if (req.body.email) {
    blogUser.find({ email: req.body.email }, async function (err, someValue) {
      await blogUser.findOneAndUpdate({ email: req.body.email }, { friendRequestsWatched: false })
      sideBarData.profile = someValue[0].profile
      if (someValue[0].friendRequestsWatched == undefined) {
        res.json(sideBarData)
      }
      else {
        sideBarData.Watched = true
        res.json(sideBarData)
      }

    })
  } else {
    res.json(sideBarData)
  }
})

app.post('/api/acceptFriendRequest', async function (req, res) {

  await blogUser.findOneAndUpdate({ username: req.body.acceptedRequestUsername },
    { $pull: { sentRequests: req.body.usernameFrom }, $push: { friends: req.body.usernameFrom } })

  await blogUser.findOneAndUpdate({ username: req.body.usernameFrom },
    { $pull: { friendRequests: { username: req.body.acceptedRequestUsername } }, $push: { friends: req.body.acceptedRequestUsername } })

  res.json({ message: true })
})

app.post('/api/friendslist', function (req, res) {
  blogUser.find({ email: req.body.email }, 'friends', function (err, data) {
    res.json({ message: data[0] })
  })
})

app.post('/api/blogtweets', function (req, res) {
  blogUser.find({ username: req.body.username }, function (err, data) {
    const resData = { thoughts: data[0].thoughts, userPersonalData: [data[0].username, data[0].profile, data[0].caption] }
    res.json(resData)
  })
})

app.post('/api/uploadProfile', async function (req, res) {
  try {
    await blogUser.findOneAndUpdate({ username: req.body.username }, { profile: req.body.profileString })
    res.json({ message: req.body.profileString })
  }
  catch (error) {
    res.json({ message: false })
  }

})

app.get('*', function (req, res) {
  res.sendFile(__dirname + '/build/index.html');
})

app.listen(4000, () => {
  console.log('server running');
})