import _ from 'lodash';

interface AnyObject {
  [key: string]: any;
}

export const getFilterData = (filter: string[], object: AnyObject) => {
  return _.pick(object, filter);
};
