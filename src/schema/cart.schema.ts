import dayjs from 'dayjs';
import * as Yup from 'yup';

export const createCartSchema = Yup.object().shape({
  body: Yup.object().shape({
    isDeleteOrder: Yup.boolean().notRequired(),
    _id: Yup.string().max(0, 'no input value'),
    rooms: Yup.array(
      Yup.object().shape({
        roomTypeId: Yup.string().objectIdValid().required(),
        quantity: Yup.number().min(1).integer().required(),
      }),
    ).when('isDeleteOrder', (isDeleteOrder, field) =>
      isDeleteOrder[0] ? field.notRequired() : field.min(1).required(),
    ),
    hotelId: Yup.string().objectIdValid().required(),
    startDate: Yup.date().min(dayjs(new Date()).format('YYYY-MM-DD')).required(),
    endDate: Yup.date()
      .test('compareStartDate', 'Not less or equal than start date', (endDate, context) =>
        endDate < context.parent.startDate ? false : true,
      )
      .required(),
  }),
});

export type CreateCartSchema = Yup.InferType<typeof createCartSchema>['body'];
