import { serve } from "../_shared/handler.ts";
import { submit } from "../_shared/submit-handler.ts";
serve((request) => submit(request, "robot"));
