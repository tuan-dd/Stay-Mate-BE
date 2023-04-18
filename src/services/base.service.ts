import {
  AnyKeys,
  Document,
  FilterQuery,
  Model,
  QueryOptions,
  SaveOptions,
  Types,
  UpdateQuery,
} from 'mongoose';

export interface QueryWithPagination<T> {
  query: FilterQuery<T>;
  page: number;
  limit: number;
}

export default class BaseService<
  Props,
  Doc extends Props & Document = Props & Document,
> {
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
    });
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

  findMany = async (query: QueryWithPagination<Doc>, option?: QueryOptions) => {
    return await this.Model.find(query.query, null, {
      lean: true,
      ...option,
    })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .exec();
  };

  findOne = async (query: FilterQuery<Doc>, option?: QueryOptions) => {
    return await this.Model.findOne(query, null, {
      lean: true,
      ...option,
    }).exec();
  };
  findById = async (id: string | Types.ObjectId, option?: QueryOptions) => {
    return await this.Model.findById(id, null, { lean: true, ...option });
  };
}
