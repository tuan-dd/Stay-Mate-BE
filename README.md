echo "# Stay-Mate" >> README.md

# Stay Mate

<h1 align="center">Hi 👋, I'm Huynh Van Anh Tuan</h1>
<h3 align="center">A passionate full Stack developer from VietNam</h3>

- 📫 How to reach me **tuandd.310797@gmail.com**

<h3 align="left">Connect with me:</h3>
<p align="left">
<a href="https://linkedin.com/in/anh-tuấn-huỳnh-văn-86a79821b/" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/linked-in-alt.svg" alt="anh-tuấn-huỳnh-văn-86a79821b/" height="30" width="40" /></a>
<a href="https://discord.gg/cat_97#5084" target="blank"><img align="center" src="https://raw.githubusercontent.com/rahuldkjain/github-profile-readme-generator/master/src/images/icons/Social/discord.svg" alt="cat_97#5084" height="30" width="40" /></a>
</p>

<h3 align="left">Languages and Tools:</h3>
<p align="left"> <a href="https://expressjs.com" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original-wordmark.svg" alt="express" width="40" height="40"/> </a> <a href="https://git-scm.com/" target="_blank" rel="noreferrer"> <img src="https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg" alt="git" width="40" height="40"/> </a> <a href="https://www.w3.org/html/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/html5/html5-original-wordmark.svg" alt="html5" width="40" height="40"/> </a> <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/javascript/javascript-original.svg" alt="javascript" width="40" height="40"/> </a> <a href="https://www.mongodb.com/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/mongodb/mongodb-original-wordmark.svg" alt="mongodb" width="40" height="40"/> </a> <a href="https://nextjs.org/" target="_blank" rel="noreferrer"> <img src="https://cdn.worldvectorlogo.com/logos/nextjs-2.svg" alt="nextjs" width="40" height="40"/> </a> <a href="https://nodejs.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original-wordmark.svg" alt="nodejs" width="40" height="40"/> </a> <a href="https://reactjs.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/react/react-original-wordmark.svg" alt="react" width="40" height="40"/> </a> <a href="https://redis.io" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original-wordmark.svg" alt="redis" width="40" height="40"/> </a> <a href="https://redux.js.org" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redux/redux-original.svg" alt="redux" width="40" height="40"/> </a> <a href="https://www.typescriptlang.org/" target="_blank" rel="noreferrer"> <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" alt="typescript" width="40" height="40"/> </a> </p>

## Description

Web book hotel is a convenient online platform developed to help customers find and book their ideal hotels from anywhere in the world. It helps travelers easily search for the best deals on accommodations according to their preferences, such as location, price, amenities, and ratings.

With Web book hotel, customers can access a plethora of hotels across the globe, from luxury five-star resorts to economy lodgings. The site offers various features that make the booking process seamless and effortless, allowing customers to complete bookings within minutes. This user-friendly experience enables customers to browse through photos and detailed descriptions of each hotel's facilities before confirming their reservations seamlessly.

Furthermore, Web book hotel provides hotel owners with an intuitive interface for registering and listing their hotels on the website. They can input valuable information about their lodging properties, such as photos, room details, pricing, contact details, location, and operating hours.

Overall, Web book hotel represents a significant leap forward in travel booking convenience and flexibility for customers worldwide. It's the perfect solution for traveling enthusiasts looking for the best plans, without breaking a bank or compromising on quality.

### Backend two week

## Diagram

<img src="./Diagram-staymate.drawio.svg">

### Authentication

-  [ ] as a user, I can register for a new account with name, email, and password, gmail ,faceBook
-  [ ] As a user, I can sign in with my email and password.
-  [ ] As a user, I can get new password when forget by link send user mail

### Users

-  [ ] as user two type : tenant/hotelier

`tenant`

-  [ ] As a user, I can see profile of a specific given a user ID.
-  [ ] As a user, can update profile password, name ,faceBook,avatar,charge money,history,...
-  [ ] As a user, can have see history books status : decline,success,stayed,pending(`limit time`)
-  [ ] As a user, can recall book,
-  [ ] As a user, book hotel , see all hotel ,payment
-  [ ] As a user, accumulate points to decrease fee (example : 1 point to 1k , 10k to 1 point)
-  [ ] As a user, can review(1 2 3 4 5 star) ,upload image(max 2 img, 1 video (10mb)) video , comment when user stayed hotel (status : success)

`hotelier`

-  [ ] create post one post hotel , must provide info hotel max 2 image,address,,video(fee) number of rooms, price of each room type, Utilities of each room type
-  [ ] option : fee post (year,month) , type 'basic' ,'premium' , payment
-  [ ] all features in tenant

### Posts

`features`

`tenant`

-  CRUD
-  [ ] As a user, I can see a list of hotel
-  [ ] As a user, I can see a post hotel
-  [ ] As a user, I can see comment
-  [ ] As a user, I filter to see (have any room, price(gte,gle), star,location,)
-  [ ] before to see post , user must input time , location

`hotelier`

-  [ ] As a user, update edit, delete , (advance: create sale off limited expiration time, limited number of times)

### Comment

`features`: text

`tenant`

-  [ ] As a user, I can see list of comments on post.
-  [ ] As a user, I can write comments on a post when user stayed hotel (status : stayed)
-  [ ] As a user, a comment have text image ,video start
-  [ ] As a user, I can update tenant comments.
-  [ ] As a user, I can delete tenant comments.
-  [ ] As a user, I can reply tenant comments.

`hotelier`

-  [ ] All tenant
-  [ ] All reply comment in hotelier post

### book and payment

-  [ ] As a user, I book hotel select type room ,time , add point
-  [ ] 4 type pending , success, stayed, decline,Cancel
-  [ ] can recall half money (advance : before 1 week refund 100%, after refund half )
-  [ ] book have status success when hotelier receiver money and tenant nhân money (when click input pass)
-  [ ] deposit withdrawal (advance)

### admin

-  [ ] block acc , delete comment ,(advance : alert )
-  [ ] see all chat

### message

-  [ ] tenant can chat with support ,hotelier ,
-  [ ] hotelier support ,hotelier
-  [ ] cant select who want chat
-  [ ] advance send img

## Endpont APIs

### Login

Go to **validations/authValidation.js** to see schema

`POST /auth/login` all can login

`PUT /auth/changePass` all can update

### User

Go to **validations/userValidation.js** to see schema

`POST /user` Register new user

`get /user/me` **Login required** info user

`get /user/income/me` **Login required** income user

`PUT /user/me` **Login required** update me

`POST /user/upgrade-hotelier` **Login required** upgrade to hotelier

`POST /user/deposit` **Login required** deposit money

`POST /user/withdrawal` **Login required** withdrawal money

### post

Go to **validations/postValidation.js** to see schema

`POST /post` \*\*\* **Login required** hotelier can create

`GET /post/:postId` \*\*\* all can see

`GET /post/` \*\*\* all can see

`PUT /post/:postId` \*\*\* **Login required** hotelier can update

`DELETE /comment/:commentId` \*\*\* **Login required** author can post

### Comment

Go to **validations/commentValidation.js** to see schema

`POST/comment` \*\*\* **Login required** tenant stayed can comment or hotelier

`GET /comment/:commentId` \*\*\* get all comment in post

`POST /comment/reply/commentId` \*\*\* all can see

`PUT /comment/:commentId` \*\*\* **Login required** author can update

`DELETE /comment/:commentId` \*\*\* **Login required** author can delete

### book and payment

Go to **validations/bookValidation.js** to see schema

`POST /book/:postId` \*\*\* **Login required** book hotel

`GET /book/hotelier/:userId` \*\*\* **Login required** author can see

`GET /book/tenant/:userId` \*\*\* **Login required** author can see

`GET /book/detail/:bookId` \*\*\* **Login required** author can see

`PUT /book/payment/:postId` \*\*\* **Login required** author can payment

`PUT /book/recall/:postId` \*\*\* **Login required** author can recall

### message

`advance`

### admin

Go to **validations/adminValidation.js** to see schema

`PUT /admin/all` \*\*\* **Login required** update everything

`DELETE /admin/:all` \*\*\* **Login required** delete everything

`ALERT /admin/alert/:userId` \*\*\* **Login required** alert

### Frontend 1 week

### use nextjs

`Create a categorized product list and filter function for the Homepage.`
`Create layouts, content, and components for the User Profile & Account Setting Page - UI without testing.`
`Create layouts, content, and components for Upload Product Page - UI without testing.`
`Create layouts, content, and components for Detail Product Page - UI without testing.`
`Create layouts, content, and components for Cart Page - UI without testing.`
`Create layouts, content, and components for Complete Buying Page - UI without testing.`
`Implement users' interaction for each page with API service and Redux.`
