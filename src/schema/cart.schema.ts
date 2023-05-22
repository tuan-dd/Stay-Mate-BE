import dayjs from 'dayjs';
import * as Yup from 'yup';

export const createCartSchema = Yup.object().shape({
  body: Yup.object().shape({
    _id: Yup.string().max(0, 'no input value'),
    rooms: Yup.array(
      Yup.object().shape({
        roomTypeId: Yup.string().objectIdValid().required(),
        quantity: Yup.number().min(1).integer().required(),
      }),
    ).when('createdAt', (createdAt, field) =>
      createdAt[0] ? field.min(1).required() : field.max(1).required(),
    ),
    hotelId: Yup.string().objectIdValid().required(),
    createdAt: Yup.date()
      .test(
        'check createdAt',
        'createdAt not greater than now date',
        (createdAt) => !dayjs(createdAt, 'YYYY-MM-DD').isAfter(dayjs(), 'day'),
      )
      .notRequired(),
    startDate: Yup.date()
      .test('check startDate', 'Start Date not less than now date', (startDate) => {
        const numberStartDate = dayjs(startDate).set('hour', 10).set('minute', 0).unix(); // get number
        const numberDayNow = dayjs().unix(); // get number
        return numberDayNow - numberStartDate < 60 * 60 * 24;
      })
      .required(),
    endDate: Yup.date()
      .test(
        'compareStartDate',
        'End Date not less or equal than start date',
        (endDate, context) => (endDate <= context.parent.startDate ? false : true),
      )
      .required(),
  }),
});

export type CreateCartSchema = Yup.InferType<typeof createCartSchema>['body'];
