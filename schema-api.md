### Authentication

#### Login with OAuth

`POST /api/auth/oauth/login`

Authorization: None

```json
{ "provider": "google",
"oauthtoken": "" }
```

​

#### Login/Regster (no OAuth)

`POST /api/auth/register`

`POST /api/auth/login`

Authorization: None

```json
{ "username": "user",
"email": "email@gmail.com",
"password": "test1234" }
```
​

#### Get user (me)

`GET /api/auth/me`

Authorization: User

#### Get any user (by id)

`GET /api/users/:id`

`GET /api/users/coaches/:id`

`GET /api/users/clients/:id`

Authorization: Depends on the account privacy

#### Request/Accept connection

`POST /api/connections`

Authorization: User

```json
{ "user\_id": 3 }
```
​

#### Get my connections

`GET /api/connections`

Authorization: User

### Programmes

#### CRUD programme

`GET /api/programmes`

`GET /api/programmes/:id`

`POST /api/programmes`

`PATCH /api/programmes/:id`

`DELETE /api/programmes/:id`

Authorization: User

```json
{ "name": "programme1",
"length": "4 weeks",
"client\_id": 5 }
```
​

### Exercises

#### Get exercises catalog

`GET /api/exercices`

Authorization: None

#### Get exercises detail

`GET /api/exercices/:id`

Authorization: None

#### CRUD exercises

`GET /api/programmes/:id/exercises`

`GET /api/programmes/:id/exercises/:id`

`POST /api/programmes/:id/exercises`

`PATCH /api/programmes/:id/exercises/:id`

`DELETE /api/programmes/:id/exercises/:id`

Authorization: User

```json
{ "exercise\_typeid": 7,
"specific\_instructions": "4x10, slow tempo" }
```
​

### Chat

#### Send/modfie/delete message

`POST /api/message`

`PATCH /api/message/:id`

`DELETE /api/message/:id`

Authorization: User

```json
{ "receiver\_id": 8, "message": "Push HARDER" }
```
​

#### Get conversation

`GET /api/chat/:userId`

Authorization: User

#### User Posts

#### CRUD Posts

`GET /api/posts`

`GET /api/posts/:id`

`POST /api/posts/`

`PATCH /api/posts/:id`

`DELETE /api/posts/:id`

Authorization: User