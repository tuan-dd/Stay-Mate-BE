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

export const deleteKeyUndefined = (pros: Pros<any>): Pros<any> => {
  Object.keys(pros).forEach((key) => {
    if (pros[key] === undefined || pros[key] === null) delete pros[key];
  });
  return { ...pros };
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
      if (key === 'createdAt_gte') {
        convertDate('$gte');
      } else {
        convertDate('$lte');
      }
    }
  });

  return { ...pros };
};

export const convertRoom = (pros: Pros<any>): Pros<any> => {
  const prices = ['price_gte', 'price_lte'];
  const keyExp = ['rateDescription', 'mealType'];

  const convertPrice = (key: '$gte' | '$lte') => {
    if (key === '$gte') {
      pros.price = {
        ...pros.price,
        [key]: pros.price_gte,
      };
      delete pros.price_gte;
    } else {
      pros.price = {
        ...pros.price,
        [key]: pros.price_lte,
      };

      delete pros.price_lte;
    }
  };

  Object.keys(pros).forEach((key) => {
    if (!pros[key] && pros[key] !== 0) delete pros[key];

    // RegExp like value.includes('abc')
    if (keyExp.includes(key) && pros[key]) {
      const regExp = new RegExp(pros[key], 'i');
      pros[key] = regExp;
    }
    if (key === 'roomAmenities') {
      pros[key] = { $in: pros[key] };
    }
    if (prices.includes(key) && (pros[key] || pros[key] === 0)) {
      if (key === 'price_gte') {
        convertPrice('$gte');
      } else {
        convertPrice('$lte');
      }
    }
  });
  return { ...pros };
};
