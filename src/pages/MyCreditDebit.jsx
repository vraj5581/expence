import React from 'react';
import CreditDebit from './CreditDebit';

const MyCreditDebit = (props) => {
  return <CreditDebit isMyView={true} {...props} />;
};

export default MyCreditDebit;
