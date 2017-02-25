# koa-api-boileplate

An opinionated Node.js API boilerplate built on top of Koa 2.0 using Knex.js written in ES7

### Uses

- [Node.js and npm](nodejs.org) Node ^4.2.3, npm ^2.14.7
- [knex](http://knexjs.org/) (`npm install --global knex`)
- [MySQL](https://hub.docker.com/_/mysql/)
- [Redis](https://redis.io/)
- [Babel](https://babeljs.io/)

##Project Structure

```
├── config               - Server and client configuration
├── lib                  - This is where src compiles and production app runs (*created on build)
├── migrations           - Knex migrations
├── public               - Where static files like images are stored (*created on upload)
│
└── src
    ├── middleware   - Our middlewares
    ├── models       - Api models
    ├── routes       - Api endpoints
    ├── services     - Our reusable or app-wide used services
    └── views        - Server rendered views

```