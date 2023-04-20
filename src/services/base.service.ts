import {
  AnyKeys,
  Document,
  FilterQuery,
  Model,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateQuery,
} from 'mongoose';

export interface QueryWithPagination<T> {
  query: FilterQuery<T>;
  page: number;
  limit: number;
}

export default class BaseService<Props, Doc extends Props & Document = Props & Document> {
  constructor(protected Model: Model<Props>) {
    this.Model = Model;
  }

  createOne = async (doc: AnyKeys<Props>) => {
    return await this.Model.create(doc);
  };

  findByIdUpdate = async (
    id: string | Types.ObjectId,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.findByIdAndUpdate(id, update, {
      lean: true,
      ...option,
    }).exec();
  };

  updateMany = async (
    query: FilterQuery<Doc>,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.updateMany(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  findOneUpdate = async (
    query: FilterQuery<Doc>,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.findOneAndUpdate(query, update, {
      lean: true,
      ...option,
    }).exec();
  };

  findMany = async (
    query: QueryWithPagination<Doc>,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.find(query.query, select, {
      lean: true,
      ...option,
    })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .exec();
  };

  findOne = async (
    query: FilterQuery<Doc>,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.findOne(query, select, {
      lean: true,
      ...option,
    }).exec();
  };

  findById = async (
    id: string | Types.ObjectId,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return await this.Model.findById(id, select, { lean: true, ...option }).exec();
  };
}
