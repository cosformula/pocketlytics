import { authedFetch } from "../../utils";

export interface UpdateAccountSettingsRequest {
  sendAutoEmailReports?: boolean;
}

export interface UpdateAccountSettingsResponse {
  success: boolean;
  settings: {
    sendAutoEmailReports: boolean;
  };
}

export function updateAccountSettings(settings: UpdateAccountSettingsRequest) {
  return authedFetch<UpdateAccountSettingsResponse>("/user/account-settings", undefined, {
    method: "POST",
    data: settings,
  });
}
