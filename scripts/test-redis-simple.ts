import IORedis from 'ioredis';
const redis = new IORedis('redis://127.0.0.1:6379');
redis.ping().then(res => console.log('PONG:', res)).catch(err => console.error('ERROR:', err)).finally(() => redis.quit());