import _ from 'lodash';

interface ObjectLodash {
  [key: string]: any;
}

export type Pros<T> = { [P in keyof T]: T[P] | any };

export const getFilterData = (filter: string[], object: ObjectLodash) => {
  return _.pick(object, filter);
};

export const getDeleteFilter = (filter: string[], object: ObjectLodash): Pros<any> => {
  return _.omit(object, filter);
};

export const deleteKeyNull = (pros: Pros<any>) => {
  Object.keys(pros).forEach((key) => {
    if (!pros[key]) delete pros[key];
  });
  return pros;
};

export const getConvertCreatedAt = (pros: Pros<any>, includes: string[]): Pros<any> => {
  const isCreatedAt = ['createdAt_gte', 'createdAt_lte'];

  if (pros.createdAt) pros.createdAt = { $gte: pros.createdAt };

  const convertDate = (key: '$gte' | '$lte') => {
    if (key === '$gte') {
      pros.createdAt = {
        ...pros.createdAt,
        [key]: pros.createdAt_gte,
      };

      delete pros.createdAt_gte;
    } else {
      pros.createdAt = {
        ...pros.createdAt,
        [key]: pros.createdAt_lte,
      };

      delete pros.createdAt_lte;
    }
  };

  Object.keys(pros).forEach((key) => {
    if (!pros[key]) delete pros[key];

    // RegExp like value.includes('abc')
    if (includes.includes(key) && pros[key]) {
      const regExp = new RegExp(pros[key], 'i');
      pros[key] = regExp;
    }
    if (isCreatedAt.includes(key) && pros[key]) {
      key === 'createdAt_gte' ? convertDate('$gte') : convertDate('$lte');
    }
  });

  return pros;
};
