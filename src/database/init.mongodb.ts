import mongoose from 'mongoose';

class Database {
   static instance: Database;
   constructor() {
      this.connect();
   }
   connect() {
      if (1 === 1) {
         mongoose.set('debug', true);
         mongoose.set('debug', { color: true });
      }
      mongoose
         .connect(process.env.URL_MONGODB as string)
         .then(() => console.log('Connected Mongodb Success'))
         .catch((_err) => console.log('Error Connect'));
   }
   static getInstance = () => {
      if (!Database.instance) {
         Database.instance = new Database();
      }
      return Database.instance;
   };
}

const instanceMongodb = Database.getInstance();

export default instanceMongodb;
