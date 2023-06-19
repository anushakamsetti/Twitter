const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is Running on http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${e.message}`);
  }
};
initializeDBAndServer();
// jwtToken Verification
const authenticateToken = (request, response, next) => {
  const { tweet } = request.body;
  const { tweetId } = request.params;
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.payload = payload;
        request.tweetId = tweetId;
        request.tweet = tweet;
        next();
      }
    });
  }
};
//Register User API -1
app.post("/register", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  console.log(username, password, name, gender);
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefine) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const createUserQuery = `
                INSERT INTO 
                    user ( name, username, password, gender)
                    VALUES(
                        '${name}',
                        '${username}',
                        '${hashedPassword}',
                        '${gender}'
                    )
                ;`;
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});
// User Login API 2
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  console.log(username, password);
  const dbUser = await db.get(selectUserQuery);
  console.log(dbUser);
  if (dbUser === undefine) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const jwtToken = jwt.sign(dbUser, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//User Tweet Feed API 3
app.get("/user/tweets/feed", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const getTweetsFeedQuery = `
       SELECT 
          username,
          tweet,
          date_time AS dateTime 
       FROM 
         follower INNER JOIN tweet ON follower.follower_user_id = tweet.user_id INNER JOIN user ON user.user_id = follower.following_user_id
        WHERE 
        follower.follower_user_id = ${user_id}
        ORDER BY 
           date_time DESC 
        LIMIT 4 
           ;`;
  const tweetFeedArray = await db.all(getTweetsFeedQuery);
  response.send(tweetFeedArray);
});
//GET user Following User NamesAPI 4
app.get("/user/following", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowsQuery = `
         SELECT 
            name 
         FROM 
          user INNER JOIN follower ON user.user_id = follower.following_user_id
          WHERE 
          follower.follower_user_id = ${user_id}
          ;`;
  const userFollowsArray = await db.all(userFollowsQuery);
  response.send(userFollowsArray);
});
// Get User Name Followers API 5
app.get("/user/followers", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name);
  const userFollowersQuery = `
         SELECT 
            name 
         FROM 
          user INNER JOIN follower ON user.user_id = follower.follower_user_id
          WHERE 
          follower.following_user_id = ${user_id}
          ;`;
  const userFollowersArray = await db.all(userFollowersQuery);
  response.send(userFollowersArray);
});

//Get Tweet API-6
app.get("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, tweetId);
  const tweetsQuery = `SELECT * FROM tweet WHERE tweet_id= ${tweetId};`;
  const tweetsResult = await db.get(tweetsQuery);
  const userFollowersQuery = `
            SELECT 
               * 
               FROM follower INNER JOIN user ON user.user_id = follower.following_user_id
               WHERE 
                 follower.follower_user_id = ${user_id}
                 ;`;
  const userFollowers = await db.all(userFollowsQuery);
  
  if (
      userFollowers.some(
          (item) => item.following_user_id === tweetsResult.user_id 
      )
  ) {
      console.log(tweetsResult);
      console.log("__________");
      console.log(userFollowers);
      const getTweetDetailsQuery = `
           SELECT 
              tweet,
              COUNT(DISTINCT(like.like_id)) AS likes,
              COUNT(DISTINCT(reply.reply_id)) AS replies,
              tweet.date_time AS dateTime 
            FROM 
              tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id INNER JOIN reply ON reply.tweet_id = tweet.tweet_id
            WHERE 
               tweet.tweet_id = ${tweetId} AND tweet.user_id=${userFollowers[0].user_id}
               ;`;
    const tweetDetails = await db.get(getTweetDetailsQuery);
    response.send(tweetDetails);
  } else {
      response.status(401);
      response.send("Invalid Request");
  }
});
//Get Tweet Liked Users API-7 
app.get(
    "/tweets/:tweetId/likes", 
    authenticateToken, 
    async (request, response) => {
       const { tweetId } = request;
       const { payload } = request;
       const { user_id, name, username, gender } = payload;
       console.log(name, tweetId);
       const getLikedUsersQuery = `
            SELECT 
               * 
               FROM 
                  follower INNER JOIN tweet ON tweet.user_id = follower.following_user_id INNER JOIN like ON like.tweet_id = tweet.tweet_id
                  INNER JOIN user ON user.user_id = like.user_id 
               WHERE 
                 tweet.tweet_id = ${tweetId} AND follower.follower_user_id = ${user_id}
            ;`;
  const likedUsers = await db.all(getLikedUsersQuery);
  console.log(likedUsers);
  if (likedUsers.length !== 0) {
      let likes = [];
      const getNamesArray = (likedUsers) => {
          for (let item of likedUsers) {
              likes.push(item.username);
          }
      };
      getNamesArray(likedUsers);
      response.send{ likes };
  } else {
       response.status(401);
       response.send("Invalid Request");
     }
  }
};
//Get Tweet API-8
app.get(
    "/tweets/:tweetId/replies", 
    authenticateToken, 
    async (request, response) => {
       const { tweetId } = request;
       const { payload } = request;
       const { user_id, name, username, gender } = payload;
       console.log(name, tweetId);
       const getRepliesUsersQuery = `
            SELECT 
               * 
               FROM 
                  follower INNER JOIN tweet ON tweet.user_id = follower.following_user_id INNER JOIN reply ON reply.tweet_id = tweet.tweet_id
                  INNER JOIN user ON user.user_id = reply.user_id 
               WHERE 
                 tweet.tweet_id = ${tweetId} AND follower.follower_user_id = ${user_id}
            ;`;
  const repliedUsers = await db.all(getRepliedUsersQuery);
  console.log(repliedUsers);
  if (repliedUsers.length !== 0) {
      let replies = [];
      const getNamesArray = (repliedUsers) => {
          for (let item of repliedUsers) {
             let object = {
                 name: item.name,
                 reply: item.reply,
             };
             replies.push(object);
          }
      };
      getNamesArray(repliedUsers);
      response.send{ replies };
  } else {
       response.status(401);
       response.send("Invalid Request");
     }
  }
);
//Get All Tweet of User API-9 
app.get("/user/tweets", authenticateToken, async (request, response) => {
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, user_id);
  const getTweetDetailsQuery = `
           SELECT 
              tweet.tweet AS tweet,
              COUNT(DISTINCT(like.like_id)) AS likes,
              COUNT(DISTINCT(reply.reply_id)) AS replies,
              tweet.date_time AS dateTime 
            FROM 
              user INNER JOIN tweet ON user.user_id = tweet.user_id INNER JOIN like ON like.tweet_id = tweet.tweet_id INNER JOIN reply ON reply.tweet_id = tweet_id
            WHERE 
               user.user_id = ${user_id}
            GROUP BY
                tweet.tweet_id 
               ;`;
    const tweetsDetails = await db.get(getTweetsDetailsQuery);
    response.send(tweetsDetails);
});
//Get Post Tweet Api-10 
app.post("/user/tweets", authenticateToken, async (request, response) => {
  const { tweet } = request;
  const { tweet } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  console.log(name, user_id);
  const postTweetQuery = `
         INSERT INTO 
            tweet (tweet, user_id)
        VALUES(
            '${tweet}',
            ${user_id}
        )
    ;`;
await db.run(postTweetQuery);
response.send("Created a Tweet");
});
//Delete Tweet Api-11
app.delete("/tweets/:tweetId", authenticateToken, async (request, response) => {
  const { tweetId } = request;
  const { payload } = request;
  const { user_id, name, username, gender } = payload;
  const selectUserQuery = `SELECT * FROM tweet WHERE tweet.user_id = ${user_id} AND tweet.tweet_id = ${tweetId};`;
  const tweetUser = await db.all(selectUserQuery);
  if (tweetUser.length !== 0) {
      const deleteTweetQuery = `
         DELETE FROM tweet 
         WHERE 
           tweet.user_id = ${user_id} AND tweet.tweet_id = ${tweetId}
           ;`;
   await db.run(deleteTweetQuery);
   response.send("Tweet Removed");
  } else {
      response.status(401);
      response.send("Invalid Request");
  }
});     

module.exports = app;


