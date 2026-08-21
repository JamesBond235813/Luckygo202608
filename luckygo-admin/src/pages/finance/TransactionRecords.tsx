import { ApiClient } from '../../lib/api';
import { FinanceRecordsPage } from './finance-shared';

const TransactionRecords = () => (
    <FinanceRecordsPage
        load={() => ApiClient.getFinanceTransactions()}
        showTypeColumn
    />
);

export default TransactionRecords;
