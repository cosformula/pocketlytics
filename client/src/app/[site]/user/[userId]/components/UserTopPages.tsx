import { useParams } from "next/navigation";
import { useState } from "react";
import { useGetSite } from "../../../../../api/admin/sites";
import { usePaginatedMetric } from "../../../../../api/analytics/useGetMetric";
import { TabsContent, TabsList, TabsTrigger } from "../../../../../components/ui/basic-tabs";
import { Card, CardContent } from "../../../../../components/ui/card";
import { Tabs } from "../../../../../components/ui/tabs";
import { truncateString } from "../../../../../lib/utils";
import { StandardSection } from "../../../components/shared/StandardSection/StandardSection";

type Tab = "pages" | "events";

export function UserTopPages() {
  const { userId } = useParams();
  const [tab, setTab] = useState<Tab>("pages");

  const { data, isLoading, isFetching, error, refetch } = usePaginatedMetric({
    parameter: "pathname",
    limit: 100,
    page: 1,
  });
  const { data: siteMetadata } = useGetSite();

  const itemsForDisplay = data?.data;

  const ratio = itemsForDisplay?.[0]?.percentage ? 100 / itemsForDisplay[0].percentage : 1;

  return (
    <Card>
      <CardContent className="mt-2">
        <Tabs defaultValue="pages" value={tab} onValueChange={value => setTab(value as Tab)}>
          <div className="flex flex-row gap-2 items-center">
            <TabsList>
              <TabsTrigger value="pages">Top Pages</TabsTrigger>
            </TabsList>
            <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="pages">
            <StandardSection
              filterParameter="pathname"
              title="Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId as string], type: "equals" }]}
            />
          </TabsContent>
          <TabsContent value="events">
            <StandardSection
              filterParameter="pathname"
              title="Pages"
              getValue={e => e.value}
              getKey={e => e.value}
              getLabel={e => truncateString(e.value, 50) || "Other"}
              getLink={e => `https://${siteMetadata?.domain}${e.value}`}
              expanded={false}
              close={close}
              customFilters={[{ parameter: "user_id", value: [userId as string], type: "equals" }]}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
