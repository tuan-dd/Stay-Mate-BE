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

export default abstract class BaseService<
  Props,
  Doc extends Props & Document = Props & Document,
> {
  constructor(protected model: Model<Props>) {
    this.model = model;
  }

  createOne = (doc: AnyKeys<Props>) => {
    return this.model.create(doc);
  };

  findByIdUpdate = (
    id: string | Types.ObjectId,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model
      .findByIdAndUpdate<Doc>(id, update, {
        lean: true,
        ...option,
      })
      .exec();
  };

  updateMany = (
    query: FilterQuery<Doc>,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model
      .updateMany<Doc>(query, update, {
        lean: true,
        ...option,
      })
      .exec();
  };

  findOneUpdate = (
    query: FilterQuery<Doc>,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model
      .findOneAndUpdate<Doc>(query, update, {
        lean: true,
        ...option,
      })
      .exec();
  };

  findMany = (
    query: QueryWithPagination<Doc>,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model
      .find<Doc>(query.query, select, {
        lean: true,
        ...option,
      })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .exec();
  };

  findOne = (
    query: FilterQuery<Doc>,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model
      .findOne<Doc>(query, select, {
        lean: true,
        ...option,
      })
      .exec();
  };

  findById = (
    id: string | Types.ObjectId,
    select?: ProjectionType<Doc>,
    option?: QueryOptions,
  ) => {
    return this.model.findById<Doc>(id, select, { lean: true, ...option }).exec();
  };

  getCountByQuery = (query?: FilterQuery<Doc>) => {
    return this.model.count(query).exec();
  };
}
