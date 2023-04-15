import { Document, FilterQuery, Model, QueryOptions, UpdateQuery } from "mongoose";
import { QueryWithPagination } from "./user.service";

export default class BaseService<Props, Doc extends Props & Document = Props & Document> {
  constructor(protected Model: Model<Props>) {

  }

  createOne(doc: Props) {
    return this.Model.create(doc);
  }

  findOneAndUpdate(
    query: FilterQuery<Doc>,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) {
    return this.Model.findOneAndUpdate(query, update, {
      lean: true,
      ...option,
    }).exec();
  }

  findWithPagination(
    query: QueryWithPagination<Doc>,
    option?: QueryOptions,
  ) {
    return this.Model.find(query.query, null, {
      lean: true,
      ...option,
    })
      .skip(query.limit * (query.page - 1))
      .limit(query.limit)
      .exec();
  }

  findById(id: string) {
    return this.Model.findById(id);
  }

  findByIdAndUpdate(
    id: string,
    update: UpdateQuery<Doc>,
    option?: QueryOptions,
  ) {
    return this.Model.findByIdAndUpdate(id, update, {
      lean: true,
      ...option,
    }).exec();
  }
}