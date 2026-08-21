import { ApiClient } from '../../lib/api';
import { FinanceRecordsPage } from './finance-shared';

const WithdrawalRecords = () => (
    <FinanceRecordsPage
        variant="withdrawal"
        load={() => ApiClient.getFinanceWithdrawals()}
    />
);

export default WithdrawalRecords;
