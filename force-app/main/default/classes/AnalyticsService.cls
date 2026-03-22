/**
 * AnalyticsService - Service class for cycle time, lead time, and cumulative flow analytics
 */
public with sharing class AnalyticsService {
    /**
     * Get cycle time analytics for a board.
     * Cycle time = time from first "In Progress" column to "Done" column.
     * Lead time = time from card creation to "Done" column.
     */
    public static KanbanBoardDTO.CycleTimeResult getCycleTimeAnalytics(
        Id boardId,
        Integer daysBack
    ) {
        KanbanBoardDTO.CycleTimeResult result = new KanbanBoardDTO.CycleTimeResult();
        result.columnTimes = new List<KanbanBoardDTO.ColumnCycleTime>();
        result.cardDetails = new List<KanbanBoardDTO.CardCycleTime>();

        DateTime sinceDate = DateTime.now().addDays(-daysBack);

        // Get all completed history entries for this board
        List<OpenSF__CardColumnHistory__c> histories = [
            SELECT
                Id,
                OpenSF__Card__c,
                OpenSF__Card__r.Name,
                OpenSF__Card__r.OpenSF__CardType__c,
                OpenSF__Card__r.CreatedDate,
                OpenSF__Column__c,
                OpenSF__Column__r.OpenSF__ColumnHeader__c,
                OpenSF__Column__r.OpenSF__Category__c,
                OpenSF__Board__c,
                OpenSF__EnteredAt__c,
                OpenSF__ExitedAt__c,
                OpenSF__DurationMinutes__c
            FROM OpenSF__CardColumnHistory__c
            WHERE
                OpenSF__Board__c = :boardId
                AND OpenSF__EnteredAt__c >= :sinceDate
                AND OpenSF__DurationMinutes__c != NULL
            WITH USER_MODE
            ORDER BY OpenSF__EnteredAt__c ASC
            LIMIT 10000
        ];

        // Group by column for average times
        Map<Id, List<Decimal>> columnDurations = new Map<Id, List<Decimal>>();
        Map<Id, String> columnNames = new Map<Id, String>();

        for (OpenSF__CardColumnHistory__c h : histories) {
            if (
                h.OpenSF__DurationMinutes__c != null &&
                h.OpenSF__Column__c != null
            ) {
                if (!columnDurations.containsKey(h.OpenSF__Column__c)) {
                    columnDurations.put(
                        h.OpenSF__Column__c,
                        new List<Decimal>()
                    );
                }
                columnDurations.get(h.OpenSF__Column__c)
                    .add(h.OpenSF__DurationMinutes__c);
                columnNames.put(
                    h.OpenSF__Column__c,
                    h.OpenSF__Column__r.OpenSF__ColumnHeader__c
                );
            }
        }

        // Calculate per-column statistics
        for (Id colId : columnDurations.keySet()) {
            List<Decimal> durations = columnDurations.get(colId);
            durations.sort();

            KanbanBoardDTO.ColumnCycleTime ct = new KanbanBoardDTO.ColumnCycleTime();
            ct.columnId = colId;
            ct.columnName = columnNames.get(colId);
            ct.cardCount = durations.size();
            ct.minMinutes = durations[0];
            ct.maxMinutes = durations[durations.size() - 1];

            Decimal sum = 0;
            for (Decimal d : durations) {
                sum += d;
            }
            ct.averageMinutes = sum / durations.size();

            // Median
            Integer mid = durations.size() / 2;
            if (Math.mod(durations.size(), 2) == 0 && durations.size() > 1) {
                ct.medianMinutes = (durations[mid - 1] + durations[mid]) / 2;
            } else {
                ct.medianMinutes = durations[mid];
            }

            result.columnTimes.add(ct);
        }

        // Calculate per-card cycle time and lead time
        // Group histories by card
        Map<Id, List<OpenSF__CardColumnHistory__c>> cardHistories = new Map<Id, List<OpenSF__CardColumnHistory__c>>();
        for (OpenSF__CardColumnHistory__c h : histories) {
            if (!cardHistories.containsKey(h.OpenSF__Card__c)) {
                cardHistories.put(
                    h.OpenSF__Card__c,
                    new List<OpenSF__CardColumnHistory__c>()
                );
            }
            cardHistories.get(h.OpenSF__Card__c).add(h);
        }

        Decimal totalCycleTime = 0;
        Decimal totalLeadTime = 0;
        Integer cycleCount = 0;
        Integer leadCount = 0;

        for (Id cardId : cardHistories.keySet()) {
            List<OpenSF__CardColumnHistory__c> cardHist = cardHistories.get(
                cardId
            );
            if (cardHist.isEmpty())
                continue;

            OpenSF__CardColumnHistory__c firstEntry = cardHist[0];
            KanbanBoardDTO.CardCycleTime cct = new KanbanBoardDTO.CardCycleTime();
            cct.cardId = cardId;
            cct.cardName = firstEntry.OpenSF__Card__r.Name;
            cct.cardType = firstEntry.OpenSF__Card__r.OpenSF__CardType__c;
            cct.createdDate = firstEntry.OpenSF__Card__r.CreatedDate;

            // Find first "In Progress" entry and last "Done" entry
            DateTime firstInProgress = null;
            DateTime lastDone = null;

            for (OpenSF__CardColumnHistory__c h : cardHist) {
                String cat = h.OpenSF__Column__r.OpenSF__Category__c;
                if (cat == 'In Progress' && firstInProgress == null) {
                    firstInProgress = h.OpenSF__EnteredAt__c;
                }
                if (
                    (cat == 'Done' || cat == 'Released') &&
                    h.OpenSF__EnteredAt__c != null
                ) {
                    lastDone = h.OpenSF__EnteredAt__c;
                }
            }

            if (
                firstInProgress != null &&
                lastDone != null &&
                lastDone > firstInProgress
            ) {
                Long cycleMs = lastDone.getTime() - firstInProgress.getTime();
                cct.cycleTimeHours = cycleMs / 3600000.0;
                totalCycleTime += cct.cycleTimeHours;
                cycleCount++;
            }

            if (cct.createdDate != null && lastDone != null) {
                Long leadMs = lastDone.getTime() - cct.createdDate.getTime();
                cct.leadTimeHours = leadMs / 3600000.0;
                totalLeadTime += cct.leadTimeHours;
                leadCount++;
                cct.completedDate = lastDone;
            }

            result.cardDetails.add(cct);
        }

        result.averageCycleTimeHours = cycleCount > 0
            ? totalCycleTime / cycleCount
            : 0;
        result.averageLeadTimeHours = leadCount > 0
            ? totalLeadTime / leadCount
            : 0;

        return result;
    }

    /**
     * Get cumulative flow data for a board.
     * Returns daily snapshots of card counts per column.
     */
    public static List<KanbanBoardDTO.CumulativeFlowDataPoint> getCumulativeFlowData(
        Id boardId,
        Integer daysBack
    ) {
        DateTime sinceDate = DateTime.now().addDays(-daysBack);

        // Get all column history entries within range
        List<OpenSF__CardColumnHistory__c> histories = [
            SELECT
                OpenSF__Column__c,
                OpenSF__Column__r.OpenSF__ColumnHeader__c,
                OpenSF__EnteredAt__c,
                OpenSF__ExitedAt__c
            FROM OpenSF__CardColumnHistory__c
            WHERE
                OpenSF__Board__c = :boardId
                AND OpenSF__EnteredAt__c >= :sinceDate
            WITH USER_MODE
            ORDER BY OpenSF__EnteredAt__c ASC
            LIMIT 10000
        ];

        // Get column names ordered by position
        List<OpenSF__Column__c> columns = KanbanBoardSelector.getColumnsByBoardId(
            boardId
        );
        List<String> columnOrder = new List<String>();
        Map<Id, String> colIdToName = new Map<Id, String>();
        for (OpenSF__Column__c col : columns) {
            columnOrder.add(col.OpenSF__ColumnHeader__c);
            colIdToName.put(col.Id, col.OpenSF__ColumnHeader__c);
        }

        // Build daily snapshots
        Date startDate = sinceDate.date();
        Date endDate = Date.today();
        Map<Date, Map<String, Integer>> dailyData = new Map<Date, Map<String, Integer>>();

        // Initialize all dates
        Date current = startDate;
        while (current <= endDate) {
            Map<String, Integer> colCounts = new Map<String, Integer>();
            for (String colName : columnOrder) {
                colCounts.put(colName, 0);
            }
            dailyData.put(current, colCounts);
            current = current.addDays(1);
        }

        // For each day, count cards that were in each column
        for (OpenSF__CardColumnHistory__c h : histories) {
            String colName = colIdToName.get(h.OpenSF__Column__c);
            if (colName == null)
                continue;

            Date enteredDate = h.OpenSF__EnteredAt__c.date();
            Date exitedDate = h.OpenSF__ExitedAt__c != null
                ? h.OpenSF__ExitedAt__c.date()
                : endDate;

            // Cap dates to our range
            if (enteredDate < startDate)
                enteredDate = startDate;
            if (exitedDate > endDate)
                exitedDate = endDate;

            Date d = enteredDate;
            while (d <= exitedDate) {
                Map<String, Integer> dayCounts = dailyData.get(d);
                if (dayCounts != null && dayCounts.containsKey(colName)) {
                    dayCounts.put(colName, dayCounts.get(colName) + 1);
                }
                d = d.addDays(1);
            }
        }

        // Convert to result format
        List<KanbanBoardDTO.CumulativeFlowDataPoint> result = new List<KanbanBoardDTO.CumulativeFlowDataPoint>();
        current = startDate;
        while (current <= endDate) {
            KanbanBoardDTO.CumulativeFlowDataPoint dp = new KanbanBoardDTO.CumulativeFlowDataPoint();
            dp.snapshotDate = current;
            dp.columnCounts = dailyData.get(current);
            result.add(dp);
            current = current.addDays(1);
        }

        return result;
    }
}
