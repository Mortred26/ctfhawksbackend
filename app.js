const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(morgan('tiny'));

const userRouter = require('./routes/user');
const testRouter = require('./routes/test');
const categoryRouter = require('./routes/category');
const groupRouter = require('./routes/group');

app.use('/api/users', userRouter);
app.use('/api/tests', testRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/groups', groupRouter);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'RedHawks'
})
  .then(() => console.log('MongoDB connected...'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));
