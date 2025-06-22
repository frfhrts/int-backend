## Mandatory .env variables
```
REDIS_CONNECTION_URI="redis://localhost:6379"
APP_PORT=3007

GCP_KEY=
GCP_SECRET=
GCP_URL=
```
- Without those variables app will not pass JOI validations

## To run tests run this command
```sh
npm run test
```


## You can access swagger on
 - {APP_URL}/swagger