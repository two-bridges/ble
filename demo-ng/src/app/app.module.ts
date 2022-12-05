import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule, NativeScriptRouterModule } from '@nativescript/angular';

// import { AppRoutingModule } from './app-routing.module';
import { routes, navigatableComponents } from './app.routing';
import { BluetoothService } from './services/bluetooth.service';
import { AppComponent } from './app.component';

@NgModule({
  bootstrap: [AppComponent],
  imports: [
    NativeScriptModule,
    NativeScriptRouterModule,
    NativeScriptRouterModule.forRoot(routes)
  ],
  declarations: [AppComponent, ...navigatableComponents],
  providers: [
    BluetoothService
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AppModule {}
